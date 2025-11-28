import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api';

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    type: 'TEXT' | 'IMAGE' | 'FILE';
}

export interface ChatUser {
    userId: string;
    status: 'ONLINE' | 'OFFLINE';
}

export const useChat = (roomId: string) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<any>(null);

    const connect = useCallback(() => {
        const token = api.token;
        if (!token) return;

        // Use wss:// for https, ws:// for http
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = import.meta.env.VITE_API_BASE_URL
            ? new URL(import.meta.env.VITE_API_BASE_URL).host
            : window.location.host; // Fallback if env var not set, though API_BASE_URL usually is full URL

        // Construct WebSocket URL
        // If VITE_API_BASE_URL is http://localhost:8787, we want ws://localhost:8787/api/chat/room/:id
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
        const wsUrl = new URL(`${baseUrl}/api/chat/room/${roomId}`);
        wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl.searchParams.set('token', token);

        const ws = new WebSocket(wsUrl.toString());

        ws.onopen = () => {
            console.log('Connected to Chat Room:', roomId);
            setIsConnected(true);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'HISTORY':
                        setMessages(data.messages.reverse()); // Backend sends reverse chronological
                        break;
                    case 'MESSAGE':
                        setMessages(prev => [...prev, data.message]);
                        break;
                    case 'PRESENCE':
                        // Handle presence updates if broadcasted to room (optional, usually handled by PresenceRegistry)
                        break;
                }
            } catch (e) {
                console.error('Failed to parse websocket message', e);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from Chat Room');
            setIsConnected(false);
            wsRef.current = null;

            // Auto-reconnect
            reconnectTimeoutRef.current = setTimeout(() => {
                console.log('Attempting to reconnect...');
                connect();
            }, 3000);
        };

        ws.onerror = (e) => {
            console.error('WebSocket error:', e);
            ws.close();
        };

        wsRef.current = ws;
    }, [roomId]);

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

    const sendMessage = (content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT') => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'MESSAGE', content, messageType: type }));
        } else {
            console.warn('WebSocket is not open');
        }
    };

    return { messages, sendMessage, isConnected, onlineUsers };
};
