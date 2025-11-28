import { Hono } from 'hono'

const presence = new Hono<{ Bindings: any }>()

// Get Online Status of a User
presence.get('/:userId', async (c) => {
    const userId = c.req.param('userId')

    // In a real app, we'd query the PresenceRegistry DO
    // For now, we'll simulate a check or just return the WebSocket endpoint for the client to subscribe

    const id = c.env.PRESENCE_REGISTRY.idFromName('global')
    const stub = c.env.PRESENCE_REGISTRY.get(id)

    // We could add a fetch handler to PresenceRegistry to return JSON status
    // But for this MVP, we'll just return a placeholder
    return c.json({ status: 'unknown', message: 'Connect to WebSocket to track presence' })
})

export default presence
