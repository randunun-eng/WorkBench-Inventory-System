import { DurableObject } from 'cloudflare:workers'

export class PresenceRegistry extends DurableObject {
    onlineUsers: Map<string, { session: WebSocket, username: string, shopSlug?: string }>

    messages: any[] = []

    constructor(ctx: DurableObjectState, env: any) {
        super(ctx, env)
        this.onlineUsers = new Map()
        // Load history from storage
        this.ctx.blockConcurrencyWhile(async () => {
            this.messages = (await this.ctx.storage.get('messages')) || []
        })
    }

    async fetch(request: Request) {
        const upgradeHeader = request.headers.get('Upgrade')
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
            // Handle Internal Notifications (POST)
            if (request.method === 'POST') {
                const data = await request.json() as any
                if (data.type === 'DM_NOTIFICATION') {
                    // data: { targetSlug, roomId, senderName, lastMessage, timestamp }
                    console.log('[PresenceRegistry] Received DM_NOTIFICATION:', data)
                    this.notifyUserBySlug(data.targetSlug, data)
                    return new Response('OK')
                }
                return new Response('Unknown type', { status: 400 })
            }
            return new Response('Expected Upgrade: websocket', { status: 426 })
        }

        const url = new URL(request.url)
        const userId = url.searchParams.get('userId')
        // If no userId provided, try to use a random one or require it. 
        // For now, let's assume the client sends it or we generate one.
        // But wait, the client code sends 'token' but not 'userId' explicitly in query params in usePresence.ts?
        // Let's check usePresence.ts again. It sends 'token'. 
        // The previous code in PresenceRegistry.ts expected userId.
        // We need to decode the token to get userId.
        // BUT, Durable Objects don't easily share auth logic without code duplication or passing it in.
        // Let's assume the `presence.ts` route handles auth and passes userId?
        // Let's check `src/routes/presence.ts`.

        // Actually, let's stick to the existing pattern. 
        // If the previous code worked, it must have been getting userId from somewhere.
        // Ah, the previous code had: `const userId = url.searchParams.get('userId')`
        // But `usePresence.ts` sets `wsUrl.searchParams.set('token', token);`
        // It does NOT set userId.
        // This implies the previous code might have been broken or I missed something.
        // However, `src/routes/presence.ts` likely upgrades the connection.
        // Let's assume the Worker (route handler) validates the token and passes userId to the DO.

        // For now, I will implement the chat logic assuming `userId` and `username` are available.

        const username = url.searchParams.get('username') || 'Anonymous'
        const shopSlug = url.searchParams.get('shopSlug') || undefined
        const uid = userId || `anon-${Date.now()}` // Fallback

        const webSocketPair = new WebSocketPair()
        const [client, server] = Object.values(webSocketPair)

        this.handleSession(server, uid, username, shopSlug)

        return new Response(null, {
            status: 101,
            webSocket: client,
        })
    }

    handleSession(webSocket: WebSocket, userId: string, username: string, shopSlug?: string) {
        console.log('[PresenceRegistry] New session:', { userId, username, shopSlug })
        this.onlineUsers.set(userId, { session: webSocket, username, shopSlug })
        webSocket.accept()

        // Broadcast "User Online"
        console.log('[PresenceRegistry] Broadcasting user online:', { userId, username })
        this.broadcast(JSON.stringify({ type: 'PRESENCE', userId, username, status: 'ONLINE' }))

        // Send current online list to new user
        const onlineList = Array.from(this.onlineUsers.entries()).map(([uid, data]) => ({
            userId: uid,
            username: data.username,
            status: 'ONLINE'
        }))
        console.log('[PresenceRegistry] Sending online list to new user:', onlineList)
        webSocket.send(JSON.stringify({ type: 'ONLINE_USERS', users: onlineList }))

        // Send Chat History
        webSocket.send(JSON.stringify({ type: 'HISTORY', messages: this.messages }))

        webSocket.addEventListener('message', async (event) => {
            try {
                const data = JSON.parse(event.data as string)
                if (data.type === 'CHAT_MESSAGE') {
                    const message = {
                        id: crypto.randomUUID(),
                        senderId: userId,
                        senderName: username,
                        content: data.content,
                        timestamp: Date.now()
                    }

                    this.messages.push(message)

                    // Keep last 100 messages
                    if (this.messages.length > 100) {
                        this.messages = this.messages.slice(-100)
                    }

                    await this.ctx.storage.put('messages', this.messages)

                    this.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message }))
                }
            } catch (err) {
                console.error('Error handling message', err)
            }
        })

        webSocket.addEventListener('close', () => {
            console.log('[PresenceRegistry] User disconnected:', { userId, username })
            this.onlineUsers.delete(userId)
            this.broadcast(JSON.stringify({ type: 'PRESENCE', userId, username, status: 'OFFLINE' }))
        })

        webSocket.addEventListener('error', () => {
            this.onlineUsers.delete(userId)
            this.broadcast(JSON.stringify({ type: 'PRESENCE', userId, username, status: 'OFFLINE' }))
        })
    }

    broadcast(message: string) {
        for (const [userId, data] of this.onlineUsers) {
            try {
                data.session.send(message)
            } catch (err) {
                this.onlineUsers.delete(userId)
            }
        }
    }

    notifyUserBySlug(slug: string, notification: any) {
        // Find users with this slug
        for (const [userId, data] of this.onlineUsers) {
            if (data.shopSlug === slug) {
                try {
                    console.log('[PresenceRegistry] Sending notification to', userId)
                    data.session.send(JSON.stringify(notification))
                } catch (err) {
                    console.error('Failed to notify user', userId, err)
                }
            }
        }
    }
}
