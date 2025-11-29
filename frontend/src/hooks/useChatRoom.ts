import { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { ChatMessage } from './usePresence';

export const useChatRoom = (roomId: string | null) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // ... (existing disconnect logic)
        if (!roomId || roomId === 'general') {
            setMessages([]);
            setNotifications([]);
            setIsConnected(false);
            setIsHistoryLoaded(false);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        const connect = () => {
            // ... (existing connect logic)
            const token = api.token;
            if (!token) return;

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://workbench-inventory.randunun.workers.dev';
            const wsUrl = new URL(`${baseUrl}/api/chat/room/${roomId}`);
            wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl.searchParams.set('token', token);

            const ws = new WebSocket(wsUrl.toString());

            ws.onopen = () => {
                console.log(`Connected to Room: ${roomId}`);
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'HISTORY') {
                        setMessages(Array.isArray(data.messages) ? data.messages : []);
                        setIsHistoryLoaded(true);
                    } else if (data.type === 'MESSAGE') {
                        console.log(`[useChatRoom ${roomId}] Received message:`, data.message);
                        setMessages(prev => [...prev, data.message]);
                    } else if (data.type === 'GUEST_NOTIFICATION') {
                        console.log(`[useChatRoom ${roomId}] Received notification:`, data);
                        setNotifications(prev => [...prev, data]);
                    }
                } catch (e) {
                    console.error('Chat error:', e);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                setIsHistoryLoaded(false);
                wsRef.current = null;
            };

            wsRef.current = ws;

            // Keep-alive ping every 30 seconds
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'PING' }));
                }
            }, 30000);

            ws.addEventListener('close', () => clearInterval(pingInterval));
        };

        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [roomId]);

    // ... (existing sendMessage)
    const sendMessage = (content: string, type: 'TEXT' | 'IMAGE' = 'TEXT', product?: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const payload: any = {
                type: 'MESSAGE',
                content,
                messageType: type
            };
            if (product) payload.product = product;
            wsRef.current.send(JSON.stringify(payload));
        }
    };

    return { messages, sendMessage, isConnected, isHistoryLoaded, notifications };
};
