import { Hono } from 'hono'

const images = new Hono<{ Bindings: any }>()

images.get('/debug/list', async (c) => {
    try {
        const list = await c.env.PUBLIC_BUCKET.list({ limit: 10 })
        return c.json({
            keys: list.objects.map((o: any) => o.key),
            truncated: list.truncated
        })
    } catch (e: any) {
        return c.json({ error: 'Failed to list bucket', details: e.message }, 500)
    }
})

images.get('/:key{.+}', async (c) => {
    const key = c.req.param('key')

    if (!key) {
        return c.text('Image key required', 400)
    }

    try {
        console.log(`[Images] Fetching key: ${key}`)
        const object = await c.env.PUBLIC_BUCKET.get(key)

        if (!object) {
            console.log(`[Images] Key not found: ${key}`)
            return c.text('Image not found', 404)
        }

        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        // Cache for 1 hour
        headers.set('Cache-Control', 'public, max-age=3600')

        return new Response(object.body, {
            headers,
        })
    } catch (e: any) {
        console.error(`[Images] Error fetching ${key}:`, e)
        return c.text('Error fetching image', 500)
    }
})

export default images
