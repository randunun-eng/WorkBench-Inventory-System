import { Hono } from 'hono'
import { authMiddleware } from '../auth'

const ai = new Hono<{ Bindings: any, Variables: { user: any } }>()

// Helper function to fetch and analyze datasheet
// Helper to upload file to Gemini File API
async function uploadToGemini(fileData: ArrayBuffer, mimeType: string, apiKey: string): Promise<string> {
    const numBytes = fileData.byteLength;

    // 1. Initial Resumable Upload Request
    const initUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
    const initResponse = await fetch(initUrl, {
        method: 'POST',
        headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': numBytes.toString(),
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file: { display_name: 'datasheet' } })
    });

    if (!initResponse.ok) {
        throw new Error(`Failed to initialize upload: ${await initResponse.text()}`);
    }

    const uploadUrl = initResponse.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
        throw new Error('No upload URL received');
    }

    // 2. Upload Actual Bytes
    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Content-Length': numBytes.toString(),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize'
        },
        body: fileData
    });

    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload bytes: ${await uploadResponse.text()}`);
    }

    const fileInfo: any = await uploadResponse.json();
    return fileInfo.file.uri;
}

// Helper function to fetch and analyze datasheet using Gemini 1.5 Flash (File API)
async function analyzeDatasheet(datasheetKey: string, publicBucket: any, apiKey: string): Promise<{ extractedText: string, fileUri: string }> {
    try {
        // Fetch file from R2
        const object = await publicBucket.get(datasheetKey)
        if (!object) {
            throw new Error('Datasheet not found');
        }

        // Check content type
        const contentType = object.httpMetadata?.contentType || 'application/pdf'
        console.log(`Analyzing datasheet: ${datasheetKey} (${contentType})`);

        // Get file data
        const fileData = await object.arrayBuffer()

        // Upload to Gemini
        const fileUri = await uploadToGemini(fileData, contentType, apiKey);
        console.log(`File uploaded to Gemini: ${fileUri}`);

        // Construct Gemini API Request using File URI
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: "Extract all technical specifications, part numbers, ratings, and key parameters from this datasheet. List them clearly in JSON format." },
                    {
                        file_data: {
                            mime_type: contentType,
                            file_uri: fileUri
                        }
                    }
                ]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            throw new Error(`Error analyzing datasheet: ${response.status} - ${errorText}`);
        }

        const data: any = await response.json();
        const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No data extracted';
        return { extractedText, fileUri };

    } catch (e: any) {
        console.error('Datasheet analysis error:', e)
        throw e;
    }
}

// Helper to call Gemini 1.5 Flash for Chat
async function callGemini(
    messages: any[],
    systemPrompt: string,
    apiKey: string,
    jsonMode: boolean = false,
    fileUris: string[] = []
): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Convert OpenAI-style messages to Gemini format
    const contents = messages.map(msg => {
        let role = 'user';
        if (msg.role === 'assistant') role = 'model';
        if (msg.role === 'system') return null; // System prompt handled separately
        return {
            role: role,
            parts: [{ text: msg.content }]
        };
    }).filter(Boolean);

    // Attach files to the last user message or create a new one
    if (fileUris.length > 0) {
        const fileParts = fileUris.map(uri => ({
            file_data: {
                mime_type: 'application/pdf', // Assuming PDF for now, can be dynamic if needed
                file_uri: uri
            }
        }));

        // Find the last user message to append files to, or create a new one
        const lastUserMsgIndex = contents.findLastIndex((c: any) => c.role === 'user');
        if (lastUserMsgIndex !== -1) {
            (contents[lastUserMsgIndex].parts as any[]).push(...fileParts);
        } else {
            (contents as any[]).push({
                role: 'user',
                parts: [...fileParts, { text: "Here are the relevant datasheets." }]
            });
        }
    }

    const payload: any = {
        contents: contents,
        system_instruction: {
            parts: [{ text: systemPrompt }]
        }
    };

    if (jsonMode) {
        payload.generationConfig = {
            response_mime_type: "application/json"
        };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

ai.post('/generate-specs', async (c) => {
    try {
        const { productName } = await c.req.json()

        if (!productName) {
            return c.json({ error: 'Product name is required' }, 400)
        }

        const systemPrompt = `
        You are a technical specification generator for electronic components.
        Your job is to generate a JSON object containing technical specifications for the given product name.
        
        RULES:
        1. Output ONLY valid JSON. No markdown, no explanations.
        2. The JSON should be a flat object with key-value pairs.
        3. Include common parameters like: voltage, current, power, package, type, resistance, capacitance, tolerance, etc., as applicable.
        4. If you are unsure about a specific value, omit it. Do not guess wildly.
        5. Example Output: { "voltage": "600V", "current": "50A", "package": "TO-247", "type": "IGBT" }
        `

        const content = await callGemini(
            [{ role: 'user', content: `Generate technical specifications for: ${productName}` }],
            systemPrompt,
            c.env.GEMINI_API_KEY,
            true // JSON Mode
        );

        return c.json({ specifications: JSON.parse(content) })

    } catch (e: any) {
        console.error('Spec generation error:', e)
        return c.json({ error: 'Failed to generate specifications', details: e.message }, 500)
    }
}, authMiddleware)

ai.post('/analyze-datasheet', async (c) => {
    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        const { datasheetKey } = await c.req.json()
        log(`Request received for key: ${datasheetKey}`);

        if (!datasheetKey) {
            return c.json({ error: 'Datasheet key is required' }, 400)
        }

        // Inline analyzeDatasheet to capture logs
        const publicBucket = c.env.PUBLIC_BUCKET;
        const apiKey = c.env.GEMINI_API_KEY;

        log('Fetching from R2...');
        const object = await publicBucket.get(datasheetKey)
        if (!object) {
            throw new Error('Datasheet not found in R2');
        }

        const contentType = object.httpMetadata?.contentType || 'application/pdf'
        log(`File found. Content-Type: ${contentType}`);

        const size = object.size;
        log(`File size: ${size} bytes`);

        // Upload to Gemini
        log('Starting Gemini Upload...');
        const initUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

        log(`Init Upload URL: ${initUrl}`);
        const initResponse = await fetch(initUrl, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': size.toString(),
                'X-Goog-Upload-Header-Content-Type': contentType,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ file: { display_name: 'datasheet' } })
        });

        if (!initResponse.ok) {
            const text = await initResponse.text();
            throw new Error(`Init Upload Failed: ${initResponse.status} - ${text}`);
        }

        const uploadUrl = initResponse.headers.get('x-goog-upload-url');
        if (!uploadUrl) throw new Error('No upload URL received');
        log('Got Upload URL. Uploading bytes (streaming)...');

        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Length': size.toString(),
                'X-Goog-Upload-Offset': '0',
                'X-Goog-Upload-Command': 'upload, finalize'
            },
            body: object.body // Stream directly from R2
        });

        if (!uploadResponse.ok) {
            const text = await uploadResponse.text();
            throw new Error(`Byte Upload Failed: ${uploadResponse.status} - ${text}`);
        }

        const fileInfo: any = await uploadResponse.json();
        const fileUri = fileInfo.file.uri;
        log(`Upload Complete. URI: ${fileUri}`);

        // Generate Content
        log('Generating content...');

        const generateWithModel = async (model: string) => {
            log(`Attempting generation with model: ${model}`);
            const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{
                    parts: [
                        { text: "Extract all technical specifications, part numbers, ratings, and key parameters from this datasheet. List them clearly in JSON format." },
                        {
                            file_data: {
                                mime_type: contentType,
                                file_uri: fileUri
                            }
                        }
                    ]
                }]
            };
            return fetch(genUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        };

        // Try the latest experimental model first (Gemini 2.0 Flash)
        let genResponse = await generateWithModel('gemini-2.0-flash-exp');

        if (!genResponse.ok && genResponse.status === 404) {
            log('Gemini 2.0 Flash failed (404). Listing available models to find a fallback...');
            const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const listResponse = await fetch(listModelsUrl);

            if (listResponse.ok) {
                const listData: any = await listResponse.json();
                const models = listData.models || [];
                log(`Available Models: ${models.map((m: any) => m.name).join(', ')}`);

                // Find best fallback: prefer 2.0, then 1.5 flash, then 1.5 pro
                const fallbackModel = models.find((m: any) => m.name.includes('gemini-2.0-flash'))?.name.split('/').pop() ||
                    models.find((m: any) => m.name.includes('gemini-1.5-flash'))?.name.split('/').pop() ||
                    models.find((m: any) => m.name.includes('gemini-1.5-pro'))?.name.split('/').pop();

                if (fallbackModel) {
                    log(`Found fallback model: ${fallbackModel}. Retrying...`);
                    genResponse = await generateWithModel(fallbackModel);
                } else {
                    log('No suitable fallback model found.');
                }
            } else {
                log('Failed to list models.');
            }
        }

        if (!genResponse.ok) {
            const text = await genResponse.text();
            throw new Error(`Generation Failed: ${genResponse.status} - ${text}`);
        }

        const data: any = await genResponse.json();
        const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No data extracted';
        log('Analysis complete.');

        return c.json({ analysis: extractedText, fileUri: fileUri })

    } catch (e: any) {
        console.error('Analysis endpoint error:', e)
        return c.json({
            error: 'Failed to analyze datasheet',
            details: `Error: ${e.message} | Logs: ${logs.join(' -> ')}`
        }, 500)
    }
}, authMiddleware)

ai.post('/ocr', async (c) => {
    return c.json({ error: 'OCR requires authentication' }, 401)
}, authMiddleware)

ai.post('/chat', async (c) => {
    try {
        const { messages } = await c.req.json()
        const user = c.get('user')

        if (!messages || !Array.isArray(messages)) {
            return c.json({ error: 'Messages array is required' }, 400)
        }

        // 0. Fetch User Memories (Only if logged in)
        let memoryContext = ''
        if (user) {
            try {
                const memories = await c.env.DB.prepare(`
                    SELECT content FROM user_memories WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
                `).bind(user.uid).all()

                if (memories.results && memories.results.length > 0) {
                    memoryContext = memories.results.map((m: any) => `- ${m.content}`).join('\n')
                }
            } catch (e) {
                console.error('Failed to fetch memories:', e)
            }
        }

        const systemPrompt = `
        You are a JSON generator for an inventory system.
        
        YOUR ONLY JOB IS TO DETECT SEARCH INTENT AND EXTRACT PRECISE KEYWORDS.
        
        RULES:
        1. If the user asks about products, parts, availability, or stock, output a JSON search command.
        2. Format: { "type": "SEARCH", "query": "keywords" }
        3. If the user asks to COMPARE items, output: { "type": "COMPARE", "items": ["item1", "item2"] }
        4. If the user asks for a RECOMMENDATION/SELECTION, output: { "type": "SELECT", "criteria": "description of needs" }
        5. EXTRACT ONLY THE SPECIFIC PRODUCT NAME OR TYPE.
        6. REMOVE generic filler words like "products", "items", "parts", "components", "inventory", "stock", "do you have", "looking for", "need", "want", "require", "search for", "find".
        7. USE CONVERSATION HISTORY to resolve pronouns or follow-up questions.
           - "How many?" -> Search for the last discussed item.
           - "Do you have it?" -> Search for the last discussed item.
           - "Price?" -> Search for the last discussed item.
           - "I need from Shop X" -> Search for the last discussed item.
        8. ONLY OUTPUT JSON.
        9. IF THE USER EXPRESSES A NEED OR WANT, IT IS A SEARCH.

        Examples:
        User: "Do you have transistors?" -> { "type": "SEARCH", "query": "transistor" }
        User: "Do you have ncep products?" -> { "type": "SEARCH", "query": "ncep" }
        User: "Check for 150v mosfets" -> { "type": "SEARCH", "query": "150v mosfet" }
        User: "need 150v mosfet" -> { "type": "SEARCH", "query": "150v mosfet" }
        User: "I want a 50A IGBT" -> { "type": "SEARCH", "query": "50A IGBT" }
        User: "How many?" (after discussing 15t14) -> { "type": "SEARCH", "query": "15t14" }
        User: "I need from ElectroFix" -> { "type": "SEARCH", "query": "15t14" }
        User: "Compare 15T14 and 40T65" -> { "type": "COMPARE", "items": ["15T14", "40T65"] }
        User: "Which one is better for high voltage?" -> { "type": "SELECT", "criteria": "high voltage" }
        `

        // 1. First pass: Ask AI what to do (Intent Detection)
        let content = await callGemini(messages, systemPrompt, c.env.GEMINI_API_KEY, true);

        let searchResults: any[] = []
        let performedSearch = false

        // 2. Check if AI wants to search
        try {
            console.log('Raw AI Response (Intent):', content);

            // Robust JSON extraction using regex (Gemini usually returns pure JSON in JSON mode, but safe to check)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const command = JSON.parse(jsonMatch[0]);
                console.log('Parsed Command:', command);

                if (command.type === 'SEARCH' || command.type === 'COMPARE' || command.type === 'SELECT') {
                    performedSearch = true;

                    let cleanQuery = '';
                    if (command.type === 'SEARCH') cleanQuery = command.query.replace(/"/g, '');
                    if (command.type === 'COMPARE') cleanQuery = command.items.join(' OR '); // Simple OR search for now
                    if (command.type === 'SELECT') cleanQuery = command.criteria; // Search by criteria

                    console.log('Executing FTS Search:', cleanQuery);

                    // 1. Execute FTS Search (Public Items from Shared Catalog)
                    const ftsResults = await c.env.DB.prepare(`
                        SELECT
                            c.id,
                            c.name,
                            c.description,
                            c.specifications,
                            c.datasheet_r2_key,
                            c.gemini_file_uri,
                            si.stock_qty,
                            si.price,
                            si.currency,
                            u.shop_name
                        FROM catalog_fts fts
                        JOIN catalog_items c ON fts.rowid = c.rowid
                        LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.is_visible_to_network = 1
                        LEFT JOIN users u ON si.shop_id = u.id
                        WHERE catalog_fts MATCH ? AND c.is_public = 1
                        LIMIT 5
                    `).bind(cleanQuery).all();

                    // 2. Execute Category Search (Find items in matching categories)
                    const categoryResults = await c.env.DB.prepare(`
                        SELECT
                            c.id,
                            c.name,
                            c.description,
                            c.specifications,
                            c.datasheet_r2_key,
                            c.gemini_file_uri,
                            si.stock_qty,
                            si.price,
                            si.currency,
                            u.shop_name
                        FROM catalog_items c
                        JOIN categories cat ON c.category_id = cat.id
                        LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.is_visible_to_network = 1
                        LEFT JOIN users u ON si.shop_id = u.id
                        WHERE cat.name LIKE ? AND c.is_public = 1
                        LIMIT 5
                    `).bind(`%${cleanQuery}%`).all();

                    // 3. Fallback: Description LIKE Search (if FTS fails or just to be safe)
                    // This helps when FTS tokenization is too strict (e.g. "150v" vs "150 V")
                    const descriptionResults = await c.env.DB.prepare(`
                        SELECT
                            c.id,
                            c.name,
                            c.description,
                            c.specifications,
                            c.datasheet_r2_key,
                            c.gemini_file_uri,
                            si.stock_qty,
                            si.price,
                            si.currency,
                            u.shop_name
                        FROM catalog_items c
                        LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.is_visible_to_network = 1
                        LEFT JOIN users u ON si.shop_id = u.id
                        WHERE (c.name LIKE ? OR c.description LIKE ?) AND c.is_public = 1
                        LIMIT 5
                    `).bind(`%${cleanQuery}%`, `%${cleanQuery}%`).all();

                    // 4. Merge and Deduplicate Results
                    const allResults = [
                        ...(ftsResults.results || []),
                        ...(categoryResults.results || []),
                        ...(descriptionResults.results || [])
                    ];
                    const uniqueMap = new Map();
                    for (const item of allResults) {
                        if (!uniqueMap.has(item.id)) {
                            uniqueMap.set(item.id, item);
                        }
                    }
                    searchResults = Array.from(uniqueMap.values()).slice(0, 5);

                    console.log('Search Results:', searchResults);

                    // Handle Empty Results - HARD STOP to prevent hallucinations
                    if (searchResults.length === 0) {
                        content = `I searched our inventory for "${command.query}" but couldn't find any matching items. Please try a different search term or check the spelling.`;
                    } else {
                        // 3. Format technical specifications from pre-extracted JSON
                        let technicalDetails = '';
                        for (const item of searchResults) {
                            if (item.specifications) {
                                // Parse specifications if string
                                const specs = typeof item.specifications === 'string'
                                    ? JSON.parse(item.specifications)
                                    : item.specifications;

                                // Format specs nicely for AI
                                technicalDetails += `\n\nTechnical specifications for ${item.name}:`;
                                if (specs.part_number) technicalDetails += `\n- Part Number: ${specs.part_number}`;
                                if (specs.type) technicalDetails += `\n- Type: ${specs.type}`;
                                if (specs.voltage_rating) technicalDetails += `\n- Voltage Rating: ${specs.voltage_rating}`;
                                if (specs.current_rating) technicalDetails += `\n- Current Rating: ${specs.current_rating}`;
                                if (specs.power_rating) technicalDetails += `\n- Power Rating: ${specs.power_rating}`;
                                if (specs.key_parameters && Array.isArray(specs.key_parameters)) {
                                    technicalDetails += `\n- Key Parameters: ${specs.key_parameters.join(', ')}`;
                                }
                                if (specs.applications && Array.isArray(specs.applications)) {
                                    technicalDetails += `\n- Applications: ${specs.applications.join(', ')}`;
                                }
                                if (specs.manufacturer) technicalDetails += `\n- Manufacturer: ${specs.manufacturer}`;

                                // Store formatted specs for frontend
                                item.datasheet_analysis = specs;
                            }
                        }

                        // 4. Prepare Structured Data for AI (Pass 2)
                        // We inject a JSON list of items with pre-generated links
                        const inventoryContext = searchResults.map(r => ({
                            name: r.name,
                            price: `${r.currency || 'LKR'} ${r.price}`,
                            stock: r.stock_qty,
                            shop: r.shop_name,
                            link: `/#/product/${r.id}`
                        }));

                        const contextContent = `OFFICIAL INVENTORY DATA (JSON):
${JSON.stringify(inventoryContext, null, 2)}

Technical Specs:
${technicalDetails}

CRITICAL INSTRUCTIONS:
- You are a strict inventory assistant.
- Answer the user's question using ONLY the JSON data above.
- If the user asks "Do you have X?", list the items with their Shop and Price.
- If the user asks "How much?", list the price for each shop.
- If the user says "I need from [Shop Name]", provide the "link" from the JSON for that shop.
- Do NOT invent data. Do NOT change prices.
- Example Output for Link: "Ok, here is the direct link to [Item] from [Shop]: [Link](url)"

USER MEMORY CONTEXT:
${memoryContext}
`;

                        const finalSystemPrompt = `
                        You are WorkBench AI, a helpful inventory assistant.
                        
                        Your goal is to help the user find and buy components using the provided inventory data.
                        
                        CRITICAL RULES:
                        1. USE THE PROVIDED JSON DATA EXACTLY.
                        2. DO NOT USE PLACEHOLDERS like "[Insert price]" or "[Insert description]".
                        3. If the data is in the JSON, output it directly.
                        4. If the data is missing, say "I don't have that information".
                        5. When listing items, include the Shop Name and Price.
                        6. When providing a link, use markdown format: [Link Text](URL).
                        
                        EXAMPLE INTERACTION:
                        User: "Do you have 15T14?"
                        Data: [{ name: "15T14", price: "LKR 350", shop: "ElectroFix", link: "/#/product/123" }]
                        You: "Yes, we have 15T14 available at ElectroFix for LKR 350. You can view it here: [View 15T14](/#/product/123)"
                        `;

                        // Collect File URIs
                        const fileUris = searchResults
                            .map(r => r.gemini_file_uri)
                            .filter(uri => uri && typeof uri === 'string')
                            .slice(0, 3); // Limit to 3 files to be safe

                        // Pass 2: Final Response Generation
                        content = await callGemini(
                            [...messages, { role: 'user', content: contextContent }],
                            finalSystemPrompt,
                            c.env.GEMINI_API_KEY,
                            false,
                            fileUris
                        );
                    }
                }
            } else {
                // Fallback if AI didn't return JSON (prevents hallucinations from Pass 1)
                console.log('AI did not return JSON search command. Fallback.');
                content = "I'm not sure which product you're asking about. Could you please specify the product name or type?";
            }
        } catch (e) {
            console.error('AI Search Logic Error:', e);
            if (content.trim().startsWith('{')) {
                content = "I'm sorry, I'm having trouble processing your search request right now. Please try again.";
            }
        }

        c.header('X-Debug-Version', 'v7-gemini-flash');

        // 5. Background Memory Extraction (Only if logged in)
        if (user) {
            c.executionCtx.waitUntil((async () => {
                try {
                    const lastUserMessage = messages[messages.length - 1].content;
                    const lastAiResponse = content;

                    const memoryPrompt = `
                    Analyze this interaction and extract any PERMANENT facts or preferences about the user.
                    
                    User: "${lastUserMessage}"
                    AI: "${lastAiResponse}"
                    
                    Rules:
                    1. Extract ONLY facts (e.g., "User prefers Shop X", "User needs 600V parts").
                    2. Ignore transient questions (e.g., "Do you have this?", "Price?").
                    3. If nothing worth remembering, output "NO_MEMORY".
                    4. Output raw text of the memory.
                    `;

                    const memoryText = await callGemini(
                        [{ role: 'user', content: memoryPrompt }],
                        'You are a memory extractor.',
                        c.env.GEMINI_API_KEY
                    );

                    const cleanMemory = memoryText.trim();
                    if (cleanMemory !== 'NO_MEMORY' && cleanMemory.length > 5) {
                        await c.env.DB.prepare(`
                            INSERT INTO user_memories (user_id, memory_type, content) VALUES (?, 'preference', ?)
                        `).bind(user.uid, cleanMemory).run();
                        console.log('Memory Stored:', cleanMemory);
                    }
                } catch (err) {
                    console.error('Memory Extraction Error:', err);
                }
            })());
        }

        return c.json({ response: content, searchPerformed: performedSearch, results: searchResults });

    } catch (e: any) {
        console.error('AI Chat Error:', e)
        return c.json({ error: 'AI chat failed', details: e.message }, 500)
    }
})

export default ai
