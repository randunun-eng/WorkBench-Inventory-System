import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api';

export interface OnlineUser {
    userId: string;
    username: string;
    status: 'ONLINE' | 'OFFLINE';
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    type?: 'TEXT' | 'IMAGE';
    product?: any;
}

export const usePresence = () => {
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<any>(null);

    const connect = useCallback(() => {
        const token = api.token;
        if (!token) return;

        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://workbench-inventory.randunun.workers.dev';
        const wsUrl = new URL(`${baseUrl}/api/chat/presence`);
        wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl.searchParams.set('token', token);

        const ws = new WebSocket(wsUrl.toString());

        ws.onopen = () => {
            console.log('Connected to Presence Registry');
            setIsConnected(true);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Presence Message:', data); // Debug log

                switch (data.type) {
                    case 'ONLINE_USERS':
                        console.log('[usePresence] Received ONLINE_USERS:', data.users); // Debug log
                        setOnlineUsers(data.users);
                        break;
                    case 'PRESENCE':
                        console.log('[usePresence] Received PRESENCE update:', data);
                        setOnlineUsers(prev => {
                            const exists = prev.find(u => u.userId === data.userId);
                            if (data.status === 'ONLINE') {
                                if (exists) {
                                    console.log('[usePresence] User already online:', data.userId);
                                    return prev; // Already in list
                                }
                                console.log('[usePresence] Adding online user:', data.userId);
                                return [...prev, { userId: data.userId, username: data.username, status: 'ONLINE' }];
                            } else {
                                console.log('[usePresence] Removing offline user:', data.userId);
                                return prev.filter(u => u.userId !== data.userId);
                            }
                        });
                        break;
                    case 'CHAT_MESSAGE':
                        setChatHistory(prev => [...prev, data.message]);
                        break;
                    case 'HISTORY':
                        setChatHistory(Array.isArray(data.messages) ? data.messages : []);
                        break;
                }
            } catch (e) {
                console.error('Failed to parse presence message', e);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from Presence Registry');
            setIsConnected(false);
            wsRef.current = null;

            // Auto-reconnect
            reconnectTimeoutRef.current = setTimeout(() => {
                console.log('Attempting to reconnect presence...');
                connect();
            }, 5000);
        };

        ws.onerror = (e) => {
            console.error('Presence WebSocket error:', e);
            ws.close();
        };

        wsRef.current = ws;
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    const sendMessage = (content: string, type: 'TEXT' | 'IMAGE' = 'TEXT', product?: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'CHAT_MESSAGE',
                content,
                messageType: type,
                product
            }));
        }
    };

    return { onlineUsers, isConnected, chatHistory, sendMessage };
};
