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
    shopSlug?: string
}

interface Env {
    CHAT_ROOM: DurableObjectNamespace
    PRESENCE_REGISTRY: DurableObjectNamespace
}

export class ChatRoom extends DurableObject {
    sessions: Map<WebSocket, WebSocketData>
    env: Env

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env)
        this.env = env
        this.sessions = new Map()
    }

    async fetch(request: Request) {
        const url = new URL(request.url)

        // Handle Internal Notifications (POST)
        if (request.method === 'POST') {
            const data = await request.json() as any
            if (data.type === 'GUEST_NOTIFICATION') {
                // Broadcast this notification to everyone in this room (The Shop Owner)
                this.broadcast(JSON.stringify(data))
                return new Response('OK')
            }
            return new Response('Unknown type', { status: 400 })
        }

        const upgradeHeader = request.headers.get('Upgrade')
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
            return new Response('Expected Upgrade: websocket', { status: 426 })
        }

        const userId = url.searchParams.get('userId') || 'anonymous'
        const username = url.searchParams.get('username') || 'Anonymous'
        const shopSlug = url.searchParams.get('shopSlug') || undefined
        const roomId = url.searchParams.get('roomId') || ''

        const webSocketPair = new WebSocketPair()
        const [client, server] = Object.values(webSocketPair)

        this.handleSession(server, { userId, username, shopSlug }, roomId)

        return new Response(null, {
            status: 101,
            webSocket: client,
        })
    }

    async handleSession(webSocket: WebSocket, userData: WebSocketData, roomId: string) {
        console.log('[ChatRoom] New session:', { roomId, userId: userData.userId, username: userData.username, shopSlug: userData.shopSlug })
        this.sessions.set(webSocket, userData)
        webSocket.accept()

        // Send history on join
        await this.cleanup()
        const history = await this.ctx.storage.list({ limit: 50, reverse: true })
        const messages = Array.from(history.values()).reverse()
        console.log('[ChatRoom] Sending history:', { roomId, messageCount: messages.length })
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

                    console.log('[ChatRoom] New message:', { roomId, senderId: message.senderId, content: message.content })

                    // Store message
                    // Use timestamp as key for sorting
                    await this.ctx.storage.put(message.timestamp.toString(), message)

                    // Broadcast
                    console.log('[ChatRoom] Broadcasting to', this.sessions.size, 'sessions')
                    this.broadcast(JSON.stringify({ type: 'MESSAGE', message }))

                    // NOTIFICATION LOGIC
                    // If this is a Guest Room (format: chat-shopSlug-guestId), notify the Shop Lobby
                    // Regex: chat-(shop-slug)-(guest-id)
                    // But shop slug can contain dashes.
                    // Convention: guest IDs start with 'guest-'
                    // So we look for the last occurrence of '-guest-'?
                    // Or simpler: The Public Frontend constructs the ID.
                    // Let's assume standard format: chat-<shop_slug>-<guest_id>
                    // where guest_id starts with 'guest-'

                    if (roomId.includes('-guest-')) {
                        const guestIndex = roomId.lastIndexOf('-guest-');
                        if (guestIndex > 0) {
                            const shopSlug = roomId.substring(5, guestIndex); // remove 'chat-' prefix
                            const lobbyId = `chat-${shopSlug}`;

                            // Send notification to Lobby
                            const id = this.env.CHAT_ROOM.idFromName(lobbyId);
                            const stub = this.env.CHAT_ROOM.get(id);

                            await stub.fetch(new Request('https://internal/notify', {
                                method: 'POST',
                                body: JSON.stringify({
                                    type: 'GUEST_NOTIFICATION',
                                    roomId: roomId,
                                    guestId: userData.userId,
                                    guestName: userData.username,
                                    lastMessage: message.content,
                                    timestamp: message.timestamp,
                                    product: message.product
                                })
                            }));
                        }
                    } else if (roomId.startsWith('dm-')) {
                        // DM Room: dm-slug1-slug2
                        // Robust recipient detection using shopSlug
                        if (userData.shopSlug) {
                            // We know who sent it (userData.shopSlug)
                            // The recipient is the OTHER slug in the room ID
                            const slugs = roomId.replace('dm-', '').split('-');
                            // This split is tricky if slugs have hyphens.
                            // BUT, we know one of them is userData.shopSlug.
                            // So we can remove userData.shopSlug from the string and see what's left.

                            // Strategy:
                            // 1. Remove 'dm-' prefix
                            // 2. We have "slug1-slug2" or "slug2-slug1" (sorted)
                            // 3. We know userData.shopSlug is one of them.

                            const combined = roomId.replace('dm-', '');
                            let targetSlug = '';

                            if (combined.startsWith(userData.shopSlug + '-')) {
                                targetSlug = combined.substring(userData.shopSlug.length + 1);
                            } else if (combined.endsWith('-' + userData.shopSlug)) {
                                targetSlug = combined.substring(0, combined.length - userData.shopSlug.length - 1);
                            }

                            if (targetSlug) {
                                console.log('[ChatRoom] Identified DM target:', targetSlug);
                                const id = this.env.PRESENCE_REGISTRY.idFromName('global');
                                const stub = this.env.PRESENCE_REGISTRY.get(id);

                                stub.fetch(new Request('https://internal/notify', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        type: 'DM_NOTIFICATION',
                                        targetSlug: targetSlug,
                                        roomId: roomId,
                                        senderName: userData.username,
                                        lastMessage: message.content,
                                        timestamp: message.timestamp,
                                        product: message.product
                                    })
                                })).catch(err => console.error('Failed to send DM notification', err));
                            } else {
                                console.warn('[ChatRoom] Could not identify target slug for DM:', roomId, 'Sender:', userData.shopSlug);
                            }
                        } else {
                            // Fallback for legacy or unknown slug (should not happen with new code)
                            console.warn('[ChatRoom] Missing shopSlug for DM sender, cannot notify recipient reliably.');
                        }
                    }
                } else if (data.type === 'PING') {
                    // Respond with PONG to keep connection alive
                    webSocket.send(JSON.stringify({ type: 'PONG' }));
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
