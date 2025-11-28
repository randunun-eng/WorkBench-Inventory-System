import { Hono } from 'hono'
import { authMiddleware } from '../auth'

const vision = new Hono<{ Bindings: any }>()

vision.use('*', authMiddleware)

vision.post('/identify', async (c) => {
    try {
        const formData = await c.req.parseBody()
        const image = formData['image']

        if (!image || !(image instanceof File)) {
            return c.json({ error: 'Image file is required' }, 400)
        }

        const arrayBuffer = await image.arrayBuffer()
        const inputs = {
            image: [...new Uint8Array(arrayBuffer)],
            prompt: `
            Analyze this image of an electronic component.
            Identify the component type (e.g., Resistor, Capacitor, IC, Connector).
            
            If it is a Resistor:
            - Attempt to read the color bands.
            - Calculate the resistance value.
            
            If it is an IC/Chip:
            - Read the part number printed on top.
            
            Return a JSON object with:
            - type: Component type.
            - value: Value (if applicable, e.g., "10k Ohm").
            - part_number: Part number (if applicable).
            - description: A brief description of what it is.
            - confidence: High/Medium/Low.
            
            Return ONLY the JSON object. Do not include markdown formatting.
            `
        }

        const response = await c.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', inputs)

        let jsonResponse = response.response
        if (jsonResponse.includes('```json')) {
            jsonResponse = jsonResponse.split('```json')[1].split('```')[0]
        } else if (jsonResponse.includes('```')) {
            jsonResponse = jsonResponse.split('```')[1].split('```')[0]
        }

        try {
            const parsed = JSON.parse(jsonResponse)
            return c.json(parsed)
        } catch (e) {
            return c.json({ error: 'Failed to parse AI response', raw: jsonResponse }, 500)
        }

    } catch (e: any) {
        console.error('Vision API Error:', e)
        return c.json({ error: 'Vision processing failed', details: e.message }, 500)
    }
})

export default vision
