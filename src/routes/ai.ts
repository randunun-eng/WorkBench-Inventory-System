import { Hono } from 'hono'
import { authMiddleware } from '../auth'
import { requirePro } from '../subscription'

const ai = new Hono<{ Bindings: any, Variables: { user: any } }>()

/**
 * Heuristic gate for memory extraction. Returns true only for messages that
 * plausibly contain a durable preference or fact about the user — long-form
 * statements with first-person pronouns and a stance verb. Everything else
 * (quick searches, single-word lookups, follow-ups like "price?") is filtered
 * out before we spend an AI call on extraction.
 */
function shouldExtractMemory(message: string): boolean {
    if (typeof message !== 'string') return false
    const trimmed = message.trim()
    if (trimmed.length < 30) return false
    // First-person + stance/action verb → likely a preference or context.
    if (/\b(I|my|me|we|our)\b.*\b(prefer|like|love|hate|need|use|build|run|own|manage|work|focus|specialise|specialize|always|usually)\b/i.test(trimmed)) {
        return true
    }
    // "I'm building/working/using X for Y" patterns.
    if (/\bI'?m\s+(working|building|making|using|trying|designing)\b/i.test(trimmed)) {
        return true
    }
    return false
}

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

/**
 * Re-upload an R2-stored datasheet to Gemini's File API and persist the new
 * URI + upload timestamp in catalog_items. Gemini files expire after ~48h,
 * so URIs stored in the DB need refreshing periodically.
 *
 * Returns the fresh { uri, mimeType } on success, or null on any failure
 * (caller should skip that item rather than abort the whole chat).
 */
async function refreshGeminiFile(
    catalogItemId: string,
    datasheetKey: string,
    publicBucket: any,
    db: any,
    apiKey: string
): Promise<{ uri: string; mimeType: string } | null> {
    try {
        const object = await publicBucket.get(datasheetKey)
        if (!object) {
            console.warn(`R2 object missing for ${datasheetKey}; skipping`)
            return null
        }
        const mimeType = object.httpMetadata?.contentType || 'application/pdf'
        const fileData = await object.arrayBuffer()
        const uri = await uploadToGemini(fileData, mimeType, apiKey)

        // Persist the fresh URI + mime + timestamp so the next chat reuses it
        // until the next 24h window closes.
        await db.prepare(`
            UPDATE catalog_items
            SET gemini_file_uri = ?, gemini_mime_type = ?, gemini_uploaded_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(uri, mimeType, catalogItemId).run()

        return { uri, mimeType }
    } catch (e) {
        console.error(`refreshGeminiFile failed for ${catalogItemId}:`, e)
        return null
    }
}

/** Per-file reference passed to Gemini (uri + its actual mime type). */
type GeminiFileRef = { uri: string; mimeType: string }

// Helper to call AI (Prioritizes Cloudflare Llama 3 to save tokens, falls back to Gemini)
async function callAI(
    messages: any[],
    systemPrompt: string,
    apiKey: string,
    jsonMode: boolean = false,
    fileRefs: GeminiFileRef[] = [],
    aiBinding: any = null
): Promise<string> {

    // 1. Try Cloudflare Llama 3 FIRST (if available and no files)
    // This saves Gemini tokens for text-only chats (RAG)
    if (aiBinding && fileRefs.length === 0) {
        try {
            console.log('Attempting Cloudflare AI (Llama 3) to save tokens...');
            const llamaMessages = [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
            ];

            const llamaResponse: any = await aiBinding.run('@cf/meta/llama-3-8b-instruct', {
                messages: llamaMessages
            });

            if (llamaResponse && llamaResponse.response) {
                console.log('Cloudflare AI success');
                return llamaResponse.response;
            }
        } catch (e) {
            console.error('Cloudflare AI failed, falling back to Gemini:', e);
        }
    }

    // 2. Gemini (Primary for files, Fallback for text)
    // Primary: Gemini 2.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Convert OpenAI-style messages to Gemini format. The type predicate on
    // .filter narrows the result so downstream code can index into it without
    // a `possibly null` complaint from TypeScript.
    type GeminiContent = { role: string; parts: any[] }
    const contents = messages.map(msg => {
        let role = 'user';
        if (msg.role === 'assistant') role = 'model';
        if (msg.role === 'system') return null; // System prompt handled separately
        return {
            role: role,
            parts: [{ text: msg.content }]
        };
    }).filter((c): c is GeminiContent => c !== null);

    // Attach files to the last user message or create a new one. Each file
    // carries its own mime type — never assume PDF, since datasheets are
    // often uploaded as images (PNG/JPG).
    if (fileRefs.length > 0) {
        const fileParts = fileRefs.map(ref => ({
            file_data: {
                mime_type: ref.mimeType,
                file_uri: ref.uri
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

ai.post('/generate-specs', authMiddleware, requirePro, async (c) => {
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

        const content = await callAI(
            [{ role: 'user', content: `Generate technical specifications for: ${productName}` }],
            systemPrompt,
            c.env.GEMINI_API_KEY,
            true, // JSON Mode
            [],
            c.env.AI
        );

        return c.json({ specifications: JSON.parse(content) })

    } catch (e: any) {
        console.error('Spec generation error:', e)
        return c.json({ error: 'Failed to generate specifications', details: e.message }, 500)
    }
})

ai.post('/analyze-datasheet', authMiddleware, requirePro, async (c) => {
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

        log(`Init Upload URL: ${initUrl.replace(apiKey, '[REDACTED]')}`);
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

        // Try the user-requested model first (Gemini 2.5 Flash)
        // Note: If this doesn't exist, the fallback logic below will handle it.
        let genResponse = await generateWithModel('gemini-2.5-flash');

        // Fallback on 404 (Not Found) OR 429 (Rate Limit)
        if (!genResponse.ok && (genResponse.status === 404 || genResponse.status === 429)) {
            log(`Primary model failed (${genResponse.status}). Listing available models to find a fallback...`);
            const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const listResponse = await fetch(listModelsUrl);

            if (listResponse.ok) {
                const listData: any = await listResponse.json();
                const models = listData.models || [];
                log(`Available Models: ${models.map((m: any) => m.name).join(', ')}`);

                // Find best fallback: prefer 1.5 flash (stable), then 1.5 pro
                // Note: We skip 2.0 flash here since it just failed
                const fallbackModel = models.find((m: any) => m.name.includes('gemini-1.5-flash'))?.name.split('/').pop() ||
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
})

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
        9. IF THE USER EXPRESSES A NEED OR WANT FOR A PART, IT IS A SEARCH.
        10. For greetings, thanks, small talk, or general / how-it-works questions that are NOT about a specific part, output: { "type": "CHAT" }
        11. If the user asks for an ALTERNATIVE, SUBSTITUTE, EQUIVALENT, REPLACEMENT, or "what can I use instead of X", output: { "type": "ALTERNATIVE", "query": "X", "category": "<component type>" }
        12. Whenever you can infer the component TYPE (transistor, mosfet, igbt, diode, capacitor, resistor, voltage regulator, inverter, etc.), include a "category" field — it powers alternative matching.

        Examples:
        User: "Hi" -> { "type": "CHAT" }
        User: "How does this work?" -> { "type": "CHAT" }
        User: "Thanks!" -> { "type": "CHAT" }
        User: "Can you help me find something?" -> { "type": "CHAT" }
        User: "Do you have transistors?" -> { "type": "SEARCH", "query": "transistor", "category": "transistor" }
        User: "What can I use instead of 2N3904?" -> { "type": "ALTERNATIVE", "query": "2N3904", "category": "transistor" }
        User: "Any equivalent for IRFZ44N?" -> { "type": "ALTERNATIVE", "query": "IRFZ44N", "category": "mosfet" }
        User: "substitute for a 7805 regulator?" -> { "type": "ALTERNATIVE", "query": "7805", "category": "voltage regulator" }
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
        let content = await callAI(messages, systemPrompt, c.env.GEMINI_API_KEY, true, [], c.env.AI);

        let searchResults: any[] = []
        let performedSearch = false

        // Friendly persona for anything that isn't a product lookup (greetings,
        // "how does this work", thanks, general advice). Keeps the bot natural
        // instead of dead-ending on a canned line.
        const conversationalSystemPrompt = `You are WorkBench AI — a warm, helpful assistant for an electronics-parts marketplace in Sri Lanka. You help people find components (transistors, MOSFETs, IGBTs, capacitors, solar inverter parts, etc.), answer questions, and guide them. Be friendly, natural and concise, like a knowledgeable shop assistant. Use the conversation history for context. If the user seems to be looking for a part, invite them to name the part or type so you can search our shops. You can explain how WorkBench works: browse parts from many Sri Lankan shops, add them to a cart, and pay each shop directly via their LANKAQR. Never invent specific stock levels, prices or part numbers — if they want specifics, offer to look it up.`

        // 2. Check if AI wants to search
        try {
            console.log('Raw AI Response (Intent):', content);

            // Robust JSON extraction using regex (Gemini usually returns pure JSON in JSON mode, but safe to check)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const command = JSON.parse(jsonMatch[0]);
                console.log('Parsed Command:', command);

                if (command.type === 'SEARCH' || command.type === 'COMPARE' || command.type === 'SELECT' || command.type === 'ALTERNATIVE') {
                    performedSearch = true;
                    const isAlt = command.type === 'ALTERNATIVE';
                    const category = (command.category || '').toString().replace(/"/g, '').trim();

                    let cleanQuery = '';
                    if (command.type === 'SEARCH' || isAlt) cleanQuery = (command.query || '').replace(/"/g, '');
                    if (command.type === 'COMPARE') cleanQuery = command.items.join(' '); // tokens are OR'd downstream
                    if (command.type === 'SELECT') cleanQuery = command.criteria; // Search by criteria

                    console.log('Executing Search:', cleanQuery);

                    // Tokenize so multi-word queries (e.g. "2SC3866 transistor") don't
                    // require EVERY term to match: OR the tokens in FTS, plus a per-token
                    // LIKE pass below, so an exact part-number token still matches even
                    // when the user appends a type word.
                    const STOPWORDS = new Set(['or','and','the','a','an','for','with','of','to','in','is','are','do','you','have'])
                    const queryTokens = cleanQuery
                        .split(/\s+/)
                        .map((t: string) => t.trim())
                        .filter((t: string) => t.length >= 2 && !STOPWORDS.has(t.toLowerCase()))
                    const effectiveTokens = queryTokens.length > 0 ? queryTokens : [cleanQuery]
                    const ftsQuery = effectiveTokens.map((t: string) => `"${t.replace(/"/g, '')}"`).join(' OR ')
                    const likeClauses = effectiveTokens.map(() => '(c.name LIKE ? OR c.description LIKE ?)').join(' OR ')
                    const likeBinds = effectiveTokens.flatMap((t: string) => [`%${t}%`, `%${t}%`])

                    // 1. Execute FTS Search (Public Items from Shared Catalog), OR'd tokens
                    let ftsResults: any = { results: [] }
                    try {
                    ftsResults = await c.env.DB.prepare(`
                        SELECT
                            c.id,
                            c.name,
                            c.description,
                            c.specifications,
                            c.datasheet_r2_key,
                            c.gemini_file_uri,
                            c.gemini_uploaded_at,
                            c.gemini_mime_type,
                            si.stock_qty,
                            si.price,
                            si.currency,
                            u.shop_name
                        FROM catalog_fts fts
                        JOIN catalog_items c ON fts.rowid = c.rowid
                        LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.is_visible_to_network = 1
                        LEFT JOIN users u ON si.shop_id = u.id
                        WHERE catalog_fts MATCH ? AND c.is_public = 1
                        LIMIT 8
                    `).bind(ftsQuery).all();
                    } catch (e) { console.error('FTS query failed (continuing with LIKE passes):', e) }

                    // 2. Execute Category Search (Find items in matching categories)
                    const categoryResults = await c.env.DB.prepare(`
                        SELECT
                            c.id,
                            c.name,
                            c.description,
                            c.specifications,
                            c.datasheet_r2_key,
                            c.gemini_file_uri,
                            c.gemini_uploaded_at,
                            c.gemini_mime_type,
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
                            c.gemini_uploaded_at,
                            c.gemini_mime_type,
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

                    // 3b. Per-token LIKE search — catches an exact part number (e.g. a
                    // bare "2SC3866") even when the user added a type word that the
                    // strict full-phrase pass would miss.
                    const tokenResults = await c.env.DB.prepare(`
                        SELECT
                            c.id, c.name, c.description, c.specifications, c.datasheet_r2_key,
                            c.gemini_file_uri, c.gemini_uploaded_at, c.gemini_mime_type,
                            si.stock_qty, si.price, si.currency, u.shop_name
                        FROM catalog_items c
                        LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.is_visible_to_network = 1
                        LEFT JOIN users u ON si.shop_id = u.id
                        WHERE (${likeClauses}) AND c.is_public = 1
                        LIMIT 8
                    `).bind(...likeBinds).all();

                    // 4. Merge and Deduplicate — strongest signal first:
                    //    exact phrase > FTS tokens > any-token LIKE > category
                    const allResults = [
                        ...(descriptionResults.results || []),
                        ...(ftsResults.results || []),
                        ...(tokenResults.results || []),
                        ...(categoryResults.results || [])
                    ];
                    const uniqueMap = new Map();
                    for (const item of allResults) {
                        if (!uniqueMap.has(item.id)) {
                            uniqueMap.set(item.id, item);
                        }
                    }
                    searchResults = Array.from(uniqueMap.values()).slice(0, 5);

                    // Alternatives: when the user explicitly asks for a substitute,
                    // OR we found nothing but know the component type, pull
                    // same-category items as candidate alternatives for the AI to
                    // evaluate against the requested part's typical specs.
                    let suggestAlternatives = isAlt;
                    const requestedPart = cleanQuery;
                    if ((isAlt || searchResults.length === 0) && (category || cleanQuery)) {
                        const term = `%${category || cleanQuery}%`;
                        const altRes = await c.env.DB.prepare(`
                            SELECT
                                c.id, c.name, c.description, c.specifications, c.datasheet_r2_key,
                                c.gemini_file_uri, c.gemini_uploaded_at, c.gemini_mime_type,
                                si.stock_qty, si.price, si.currency, u.shop_name
                            FROM catalog_items c
                            LEFT JOIN categories cat ON c.category_id = cat.id
                            LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.is_visible_to_network = 1
                            LEFT JOIN users u ON si.shop_id = u.id
                            WHERE c.is_public = 1 AND (cat.name LIKE ? OR c.name LIKE ? OR c.description LIKE ?)
                            LIMIT 12
                        `).bind(term, term, term).all();

                        const altItems = (altRes.results || []).filter((it: any) =>
                            !(requestedPart && String(it.name).toLowerCase() === requestedPart.toLowerCase())
                        );
                        if ((isAlt || searchResults.length === 0) && altItems.length > 0) {
                            const m = new Map<string, any>();
                            for (const it of [...searchResults, ...altItems]) if (!m.has(it.id)) m.set(it.id, it);
                            searchResults = Array.from(m.values()).slice(0, 6);
                            suggestAlternatives = true;
                        }
                    }

                    console.log('Search Results:', searchResults);

                    // Handle Empty Results - HARD STOP to prevent hallucinations
                    if (searchResults.length === 0) {
                        content = `I couldn't find anything matching "${cleanQuery}" in our shops right now. Try a different spelling or a broader term — or tell me what you're building and I'll suggest some options.`;
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
                            link: `/product/${r.id}`
                        }));

                        const altContext = suggestAlternatives ? `

ALTERNATIVES MODE:
- The user is looking for "${requestedPart}"${category ? ` (a ${category})` : ''}, which may be out of stock or not carried by us.
- Using your electronics knowledge of "${requestedPart}"'s typical characteristics (type/polarity, voltage/current/power ratings, package, pinout), recommend the CLOSEST substitutes from the inventory JSON above.
- For each suggestion, briefly justify it on key electrical specs and FLAG any differences the user must verify (pinout/package, max voltage/current, gate-threshold, hFE, etc.).
- Recommend ONLY items present in the inventory JSON. If none is a sound electrical match, say so honestly and tell them which spec to look for.
` : '';

                        const contextContent = `OFFICIAL INVENTORY DATA (JSON):
${JSON.stringify(inventoryContext, null, 2)}

Technical Specs:
${technicalDetails}
${altContext}
CRITICAL INSTRUCTIONS:
- For PRICES, STOCK, SHOP NAMES and LINKS: use ONLY the JSON data above. Never invent or change these numbers.
- For TECHNICAL SPECIFICATIONS (voltage, current, power, package/pinout, type, applications, etc.): if a datasheet document is attached to this message, READ IT and quote the exact values. The attached datasheets belong to the products listed in the JSON above.
- If the user asks "Do you have X?", list the items with their Shop and Price.
- If the user asks "How much?", list the price for each shop.
- If the user asks for specs/ratings: answer from the attached datasheet. Only if no datasheet is attached should you say you don't have the datasheet on file.
- If the user says "I need from [Shop Name]", provide the "link" from the JSON for that shop.
- Do NOT invent prices or stock. Do NOT change prices.
- Example Output for Link: "Ok, here is the direct link to [Item] from [Shop]: [Link](url)"

USER MEMORY CONTEXT:
${memoryContext}
`;

                        const finalSystemPrompt = `
                        You are WorkBench AI — an EXPERT electronics components assistant for a Sri Lankan parts marketplace. You know semiconductor and component equivalents, you read datasheets, and you match parts by their electrical specifications. You help users find parts, evaluate datasheets, and choose suitable in-stock alternatives.

                        CRITICAL RULES:
                        1. USE THE PROVIDED JSON DATA EXACTLY for price, stock, shop and links.
                        2. DO NOT USE PLACEHOLDERS like "[Insert price]" or "[Insert description]".
                        3. If the data is in the JSON, output it directly.
                        4. For TECHNICAL SPECIFICATIONS, read any attached datasheet document and quote the real values. Only say "I don't have the datasheet for that on file" if no datasheet is attached.
                        5. Never invent prices or stock levels. Only recommend parts that appear in the provided inventory.
                        6. When listing items, include the Shop Name and Price.
                        7. When providing a link, use markdown format: [Link Text](URL).
                        8. When recommending an ALTERNATIVE/substitute, justify the match on key specs and warn about differences to verify (pinout/package/ratings). Be precise and technical but concise.

                        EXAMPLE INTERACTION:
                        User: "Do you have 15T14?"
                        Data: [{ name: "15T14", price: "LKR 350", shop: "ElectroFix", link: "/product/123" }]
                        You: "Yes, we have 15T14 available at ElectroFix for LKR 350. You can view it here: [View 15T14](/product/123)"
                        `;

                        // Collect File URIs, refreshing any stale ones first.
                        // Gemini's File API expires uploads after ~48h, so we
                        // re-upload from R2 whenever the cached URI is older
                        // than 24h (or has no timestamp, i.e. legacy data).
                        const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000
                        const now = Date.now()

                        const candidateItems = searchResults
                            .filter(r => r.datasheet_r2_key && typeof r.datasheet_r2_key === 'string')
                            .slice(0, 3) // Limit to 3 files to be safe

                        const fileRefs: GeminiFileRef[] = []
                        for (const item of candidateItems) {
                            const uploadedAt = item.gemini_uploaded_at
                                ? new Date(item.gemini_uploaded_at).getTime()
                                : 0
                            const isStale = !item.gemini_file_uri || (now - uploadedAt) > STALE_THRESHOLD_MS

                            if (!isStale) {
                                fileRefs.push({
                                    uri: item.gemini_file_uri,
                                    mimeType: item.gemini_mime_type || 'application/pdf'
                                })
                                continue
                            }

                            // Refresh in-line. Failure is non-fatal: we just
                            // skip the file and let the AI work with the
                            // search-results JSON it already has.
                            const refreshed = await refreshGeminiFile(
                                item.id,
                                item.datasheet_r2_key,
                                c.env.PUBLIC_BUCKET,
                                c.env.DB,
                                c.env.GEMINI_API_KEY
                            )
                            if (refreshed) fileRefs.push(refreshed)
                        }

                        // Pass 2: Final Response Generation
                        content = await callAI(
                            [...messages, { role: 'user', content: contextContent }],
                            finalSystemPrompt,
                            c.env.GEMINI_API_KEY,
                            false,
                            fileRefs,
                            c.env.AI
                        );
                    }
                } else {
                    // A non-product command (CHAT / greeting / general question)
                    // → answer naturally instead of forcing a product flow.
                    content = await callAI(messages, conversationalSystemPrompt, c.env.GEMINI_API_KEY, false, [], c.env.AI);
                }
            } else {
                // No JSON command at all → treat it as conversation, not a
                // canned dead-end. This is the big "feels robotic" fix.
                console.log('No JSON command; responding conversationally.');
                content = await callAI(messages, conversationalSystemPrompt, c.env.GEMINI_API_KEY, false, [], c.env.AI);
            }
        } catch (e) {
            console.error('AI Search Logic Error:', e);
            if (content.trim().startsWith('{')) {
                content = "I'm sorry, I'm having trouble processing your search request right now. Please try again.";
            }
        }

        c.header('X-Debug-Version', 'v7-gemini-flash');

        // 5. Background Memory Extraction (Only if logged in AND the message
        // looks like it contains a preference / fact worth remembering).
        //
        // Most chat turns are quick searches ("do you have X?", "price?") that
        // contain nothing memorable. Running the extraction LLM on every turn
        // doubled our outbound AI calls for zero benefit. We gate it on a
        // first-person preference signal and minimum length.
        if (user && shouldExtractMemory(messages[messages.length - 1].content)) {
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

                    // No fileRefs → callAI uses free Cloudflare Llama, not Gemini.
                    const memoryText = await callAI(
                        [{ role: 'user', content: memoryPrompt }],
                        'You are a memory extractor.',
                        c.env.GEMINI_API_KEY,
                        false,
                        [],
                        c.env.AI
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
