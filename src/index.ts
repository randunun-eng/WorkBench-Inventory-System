import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
    DB: D1Database
    PUBLIC_BUCKET: R2Bucket
    PRIVATE_BUCKET: R2Bucket
    CHAT_ROOM: DurableObjectNamespace
    PRESENCE_REGISTRY: DurableObjectNamespace
    ASSETS: Fetcher
}

import auth from './routes/auth'
import inventory from './routes/inventory'
import upload from './routes/upload'
import search from './routes/search'
import shop from './routes/shop'
import seo from './routes/seo'
import chat from './routes/chat'
import network from './routes/network'
import presence from './routes/presence'
import ai from './routes/ai'
import vision from './routes/vision'
import admin from './routes/admin'
import categories from './routes/categories'
import images from './routes/images'

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

// Mount SEO handler at root to intercept product pages
app.route('/', seo)

app.route('/auth', auth)
app.route('/api/inventory', inventory)
app.route('/api/upload', upload)
app.route('/api/search', search)
app.route('/api/chat', chat)
app.route('/api/network', network)
app.route('/api/ai', ai)
app.route('/api/shop', shop)
app.route('/api/admin', admin)
app.route('/api/categories', categories)
app.route('/api/presence', presence)
app.route('/api/vision', vision)
app.route('/api/images', images)

app.get('/api', (c) => {
    return c.json({ message: 'WorkBench Inventory API is running!', version: '1.0.0' })
})

// Serve frontend assets for all non-API routes
app.get('*', async (c) => {
    const url = new URL(c.req.url)

    // If it's an API route, it should have been handled by now
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) {
        return c.notFound()
    }

    // Try to fetch the asset from the ASSETS binding
    if (c.env.ASSETS) {
        try {
            const assetResponse = await c.env.ASSETS.fetch(c.req.raw)

            // If the asset is not found and it's not a file request (no extension),
            // serve index.html for client-side routing
            if (assetResponse.status === 404 && !url.pathname.includes('.')) {
                const indexUrl = new URL(c.req.url)
                indexUrl.pathname = '/index.html'
                return c.env.ASSETS.fetch(indexUrl.toString())
            }

            return assetResponse
        } catch (e) {
            console.error('Error fetching asset:', e)
        }
    }

    // Fallback
    return c.html(`
        <html>
            <body>
                <h1>WorkBench Inventory System</h1>
                <p>Frontend assets not configured. Please build the frontend first.</p>
                <p><a href="/api">API Status</a></p>
            </body>
        </html>
    `)
})

export default app
export { ChatRoom } from './do/ChatRoom'
export { PresenceRegistry } from './do/PresenceRegistry'
