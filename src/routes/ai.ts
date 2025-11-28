import { Hono } from 'hono'
import { authMiddleware } from '../auth'

const ai = new Hono<{ Bindings: any, Variables: { user: any } }>()

// Helper function to fetch and analyze datasheet
async function analyzeDatasheet(datasheetKey: string, publicBucket: any, aiBinding: any): Promise<string> {
    try {
        // Fetch file from R2
        const object = await publicBucket.get(datasheetKey)
        if (!object) {
            return 'Datasheet not found'
        }

        // Check content type
        const contentType = object.httpMetadata?.contentType || ''

        // Only analyze images, skip PDFs
        if (contentType === 'application/pdf' || datasheetKey.toLowerCase().endsWith('.pdf')) {
            return 'Datasheet available for download (PDF format - automatic analysis not yet supported for multi-page PDFs)'
        }

        // Only proceed with images
        if (!contentType.startsWith('image/')) {
            return 'Datasheet format not supported for automatic analysis'
        }

        // Convert to array buffer
        const imageData = await object.arrayBuffer()

        // Check size (vision model has limits)
        if (imageData.byteLength > 5000000) { // 5MB limit
            return 'Datasheet image too large for automatic analysis. Please download to view.'
        }

        const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageData)))

        // Use vision model to analyze
        const visionResponse = await aiBinding.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Extract all technical specifications, part numbers, ratings, and key parameters from this datasheet. List them clearly.'
                        },
                        {
                            type: 'image_url',
                            image_url: `data:image/jpeg;base64,${base64Image}`
                        }
                    ]
                }
            ]
        })

        return visionResponse.response || 'Could not extract data from datasheet'
    } catch (e) {
        console.error('Datasheet analysis error:', e)
        return 'Error analyzing datasheet'
    }
}

ai.post('/ocr', async (c) => {
    return c.json({ error: 'OCR requires authentication' }, 401)
}, authMiddleware)

ai.post('/chat', async (c) => {
    try {
        const { messages } = await c.req.json()

        if (!messages || !Array.isArray(messages)) {
            return c.json({ error: 'Messages array is required' }, 400)
        }

        const systemPrompt = `
        You are a JSON generator for an inventory system.
        
        YOUR ONLY JOB IS TO DETECT SEARCH INTENT AND EXTRACT PRECISE KEYWORDS.
        
        RULES:
        1. If the user asks about products, parts, availability, or stock, output a JSON search command.
        2. Format: { "type": "SEARCH", "query": "keywords" }
        3. EXTRACT ONLY THE SPECIFIC PRODUCT NAME OR TYPE.
        4. REMOVE generic filler words like "products", "items", "parts", "components", "inventory", "stock", "do you have", "looking for".
        5. USE CONVERSATION HISTORY to resolve pronouns or follow-up questions.
           - "How many?" -> Search for the last discussed item.
           - "Do you have it?" -> Search for the last discussed item.
           - "Price?" -> Search for the last discussed item.
           - "I need from Shop X" -> Search for the last discussed item.
        6. ONLY OUTPUT JSON.

        Examples:
        User: "Do you have transistors?" -> { "type": "SEARCH", "query": "transistor" }
        User: "Do you have ncep products?" -> { "type": "SEARCH", "query": "ncep" }
        User: "Check for 150v mosfets" -> { "type": "SEARCH", "query": "150v mosfet" }
        User: "How many?" (after discussing 15t14) -> { "type": "SEARCH", "query": "15t14" }
        User: "I need from ElectroFix" -> { "type": "SEARCH", "query": "15t14" }
        `

        // 1. First pass: Ask AI what to do
        const aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ]
        })

        let content = aiResponse.response
        let searchResults: any[] = []
        let performedSearch = false

        // 2. Check if AI wants to search
        try {
            console.log('Raw AI Response:', content);

            // Robust JSON extraction using regex
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const command = JSON.parse(jsonMatch[0]);
                console.log('Parsed Command:', command);

                if (command.type === 'SEARCH') {
                    performedSearch = true;

                    // Use the exact query from AI (which is now cleaned of filler words)
                    // Just remove quotes to be safe
                    const cleanQuery = command.query.replace(/"/g, '');
                    console.log('Executing FTS Search:', cleanQuery);

                    // 1. Execute FTS Search (Public Items from Shared Catalog)
                    const ftsResults = await c.env.DB.prepare(`
                        SELECT
                            c.id,
                            c.name,
                            c.description,
                            c.specifications,
                            c.datasheet_r2_key,
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

                    // 3. Merge and Deduplicate Results
                    const allResults = [...(ftsResults.results || []), ...(categoryResults.results || [])];
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
- Example Output for Link: "Ok, here is the direct link to [Item] from [Shop]: [Link](url)"`;

                        const contextMessage = {
                            role: 'system',
                            content: contextContent
                        };

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

                        const finalResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
                            messages: [
                                { role: 'system', content: finalSystemPrompt },
                                ...messages,
                                // Inject context as a USER message to ensure the model attends to it strongly
                                { role: 'user', content: contextContent }
                            ]
                        });

                        content = finalResponse.response;
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

        c.header('X-Debug-Version', 'v5-strict-no-hallucinations');
        return c.json({ response: content, searchPerformed: performedSearch, results: searchResults });

    } catch (e: any) {
        console.error('AI Chat Error:', e)
        return c.json({ error: 'AI chat failed', details: e.message }, 500)
    }
})

export default ai
