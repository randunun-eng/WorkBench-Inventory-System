import { Hono } from 'hono'
import { verifyToken } from '../auth'

const chat = new Hono<{ Bindings: any }>()

// We don't use authMiddleware for the WebSocket upgrade directly because 
// WebSockets usually don't send Authorization headers easily in browsers.
// Instead, we pass the token as a query param or handle auth inside the DO.
// For this MVP, we'll assume the client sends ?token=... and we validate it here.

chat.get('/room/:roomId', async (c) => {
    const roomId = c.req.param('roomId')
    const upgradeHeader = c.req.header('Upgrade')
    const token = c.req.query('token')
    const guestId = c.req.query('guestId')
    const guestName = c.req.query('guestName')

    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return c.text('Expected Upgrade: websocket', 426)
    }

    let userId = '';
    let username = '';

    const url = new URL(c.req.url)

    if (token) {
        // Authenticated User (Shop Owner)
        const user = await verifyToken(token)
        if (!user) {
            return c.text('Invalid token', 401)
        }
        const userData = user as any
        userId = userData.uid
        username = userData.shop_name || userData.email.split('@')[0]
        const shopSlug = userData.shop_slug || ''
        console.log('[Chat Route] Authenticated user:', { userId, username, shopSlug, userData })
        url.searchParams.set('shopSlug', shopSlug)
    } else if (guestId) {
        // Guest User (Public Storefront)
        userId = guestId
        username = guestName || 'Guest'
    } else {
        return c.text('Missing token or guestId', 401)
    }

    const id = c.env.CHAT_ROOM.idFromName(roomId)
    const stub = c.env.CHAT_ROOM.get(id)

    url.searchParams.set('userId', userId)
    url.searchParams.set('username', username)
    url.searchParams.set('roomId', roomId)

    const newReq = new Request(url.toString(), c.req.raw)
    return stub.fetch(newReq)
})

chat.get('/presence', async (c) => {
    const upgradeHeader = c.req.header('Upgrade')
    const token = c.req.query('token')

    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return c.text('Expected Upgrade: websocket', 426)
    }

    if (!token) {
        return c.text('Missing token', 401)
    }

    const user = await verifyToken(token)
    if (!user) {
        return c.text('Invalid token', 401)
    }

    // Singleton for Presence Registry (or sharded by region in future)
    const id = c.env.PRESENCE_REGISTRY.idFromName('global')
    const stub = c.env.PRESENCE_REGISTRY.get(id)

    const url = new URL(c.req.url)
    const userData = user as any
    const userId = userData.uid
    const username = userData.shop_name || userData.email.split('@')[0]
    const shopSlug = userData.shop_slug || ''
    console.log('[Presence Route] Authenticated user:', { userId, username, shopSlug, userData })
    url.searchParams.set('userId', userId)
    url.searchParams.set('username', username)
    url.searchParams.set('shopSlug', shopSlug)

    const newReq = new Request(url.toString(), c.req.raw)
    return stub.fetch(newReq)
})

export default chat
