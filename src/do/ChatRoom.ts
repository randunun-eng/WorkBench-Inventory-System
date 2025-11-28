import { DurableObject } from 'cloudflare:workers'

interface ChatMessage {
    id: string
    senderId: string
    senderName: string
    content: string
    timestamp: number
    type: 'TEXT' | 'IMAGE' | 'FILE'
    product?: {
        id: string
        name: string
        image: string
        price: string
    }
}

interface WebSocketData {
    userId: string
    username: string
}

export class ChatRoom extends DurableObject {
    sessions: Map<WebSocket, WebSocketData>

    constructor(ctx: DurableObjectState, env: any) {
        super(ctx, env)
        this.sessions = new Map()
    }

    async fetch(request: Request) {
        const upgradeHeader = request.headers.get('Upgrade')
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
            return new Response('Expected Upgrade: websocket', { status: 426 })
        }

        const url = new URL(request.url)
        const userId = url.searchParams.get('userId') || 'anonymous'
        const username = url.searchParams.get('username') || 'Anonymous'

        const webSocketPair = new WebSocketPair()
        const [client, server] = Object.values(webSocketPair)

        this.handleSession(server, { userId, username })

        return new Response(null, {
            status: 101,
            webSocket: client,
        })
    }

    async handleSession(webSocket: WebSocket, userData: WebSocketData) {
        this.sessions.set(webSocket, userData)
        webSocket.accept()

        // Send history on join
        await this.cleanup()
        const history = await this.ctx.storage.list({ limit: 50, reverse: true })
        const messages = Array.from(history.values())
        webSocket.send(JSON.stringify({ type: 'HISTORY', messages }))

        webSocket.addEventListener('message', async (event) => {
            try {
                const data = JSON.parse(event.data as string)

                if (data.type === 'MESSAGE') {
                    const message: ChatMessage = {
                        id: crypto.randomUUID(),
                        senderId: userData.userId,
                        senderName: userData.username,
                        content: data.content,
                        timestamp: Date.now(),
                        type: data.messageType || 'TEXT',
                        product: data.product // Store product context
                    }

                    // Store message
                    // Use timestamp as key for sorting
                    await this.ctx.storage.put(message.timestamp.toString(), message)

                    // Broadcast
                    this.broadcast(JSON.stringify({ type: 'MESSAGE', message }))
                }

            } catch (err) {
                webSocket.send(JSON.stringify({ error: 'Invalid message format' }))
            }
        })

        webSocket.addEventListener('close', () => {
            this.sessions.delete(webSocket)
        })

        webSocket.addEventListener('error', () => {
            this.sessions.delete(webSocket)
        })
    }

    broadcast(message: string) {
        for (const [session, _] of this.sessions) {
            try {
                session.send(message)
            } catch (err) {
                this.sessions.delete(session)
            }
        }
    }

    async cleanup() {
        const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000
        const cutoff = Date.now() - TWO_WEEKS_MS

        // List all keys (timestamps)
        const list = await this.ctx.storage.list()
        const keysToDelete: string[] = []

        for (const [key, _] of list) {
            const timestamp = parseInt(key)
            if (timestamp < cutoff) {
                keysToDelete.push(key)
            }
        }

        if (keysToDelete.length > 0) {
            await this.ctx.storage.delete(keysToDelete)
        }
    }
}
