import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Paperclip, Smile, Image as ImageIcon } from 'lucide-react';
import { ShopProfile, Product } from '../types';
import { api } from '../api';

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    shop: ShopProfile;
    product?: Product | null; // Optional product context
}

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    type?: 'TEXT' | 'IMAGE';
    product?: {
        id: string;
        name: string;
        image: string;
        price: string;
    };
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, shop, product }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate or retrieve a guest ID
    const getGuestId = () => {
        let guestId = localStorage.getItem('guest_chat_id');
        if (!guestId) {
            guestId = `guest-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('guest_chat_id', guestId);
        }
        return guestId;
    };

    const guestId = getGuestId();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // WebSocket Connection
    useEffect(() => {
        if (!isOpen) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        const connect = () => {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://workbench-inventory.randunun.workers.dev';
            // Use shop slug + guest ID as room ID for private chat
            const roomId = `chat-${shop.slug}-${guestId}`;
            const wsUrl = new URL(`${baseUrl}/api/chat/room/${roomId}`);
            wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl.searchParams.set('guestId', guestId);
            wsUrl.searchParams.set('guestName', 'Guest Customer');

            const ws = new WebSocket(wsUrl.toString());

            ws.onopen = () => {
                console.log('Connected to Shop Chat');
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'HISTORY') {
                        setMessages(data.messages);
                    } else if (data.type === 'MESSAGE') {
                        setMessages(prev => [...prev, data.message]);
                    }
                } catch (e) {
                    console.error('Chat error:', e);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                wsRef.current = null;
            };

            wsRef.current = ws;
        };

        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [isOpen, shop.slug, guestId]);

    const handleSend = (content: string = inputText, type: 'TEXT' | 'IMAGE' = 'TEXT') => {
        if (!content.trim() || !wsRef.current) return;

        const payload: any = {
            type: 'MESSAGE',
            content: content,
            messageType: type
        };

        if (product) {
            payload.product = {
                id: product.id,
                name: product.name,
                image: product.image,
                price: product.price ? `${product.currency} ${product.price}` : 'Contact for Price'
            };
        }

        wsRef.current.send(JSON.stringify(payload));
        if (type === 'TEXT') setInputText('');
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { key } = await api.uploadImage(file, false); // Public upload
            handleSend(key, 'IMAGE');
        } catch (error) {
            console.error('Failed to upload file', error);
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!isOpen) return null;

    // Helper to render message content
    const renderContent = (msg: Message) => {
        if (msg.type === 'IMAGE' || msg.content.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            const imageUrl = msg.content.startsWith('http')
                ? msg.content
                : api.getImageUrl(msg.content);
            return (
                <div className="mt-1">
                    <img src={imageUrl} alt="Shared image" className="max-w-xs rounded-lg border border-gray-200" />
                </div>
            );
        }
        return <p>{msg.content}</p>;
    };

    return (
        <div className="fixed inset-y-0 left-0 z-50 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col border-r border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-brand-dark text-white">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold overflow-hidden border border-white/20">
                            {shop.logo_r2_key ? (
                                <img src={api.getImageUrl(shop.logo_r2_key)} alt={shop.name} className="w-full h-full object-cover" />
                            ) : (
                                shop.name.charAt(0)
                            )}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-brand-dark ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">{shop.name}</h3>
                        <span className="text-xs text-blue-200">{isConnected ? 'Online now' : 'Connecting...'}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Product Context Banner */}
            {product && (
                <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-center gap-3">
                    <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover bg-white border border-blue-100" />
                    <div className="flex-1 min-w-0">
                        <div className="text-xs text-blue-600 font-medium uppercase">Inquiring about</div>
                        <div className="text-sm font-bold text-gray-800 truncate">{product.name}</div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => {
                    const isMe = msg.senderId === guestId;
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe
                                    ? 'bg-brand-blue text-white rounded-tr-none'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                                    }`}
                            >
                                {/* Product Tag in Message Bubble (if present) */}
                                {msg.product && !isMe && (
                                    <div className="mb-2 pb-2 border-b border-gray-100 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden shrink-0">
                                            <img src={msg.product.image} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] text-gray-500 uppercase">Product Inquiry</div>
                                            <div className="font-bold truncate text-xs">{msg.product.name}</div>
                                        </div>
                                    </div>
                                )}

                                {renderContent(msg)}
                                <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'
                                    }`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 border border-gray-200 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue transition-all">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <Paperclip size={18} />
                    </button>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={isUploading ? "Uploading..." : "Type a message..."}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder-gray-400"
                        disabled={isUploading}
                    />
                    <button className="text-gray-400 hover:text-gray-600">
                        <Smile size={18} />
                    </button>
                    <button
                        onClick={() => handleSend()}
                        disabled={!inputText.trim() || !isConnected || isUploading}
                        className={`p-2 rounded-full transition-all ${inputText.trim() && isConnected
                            ? 'bg-brand-blue text-white shadow-md hover:bg-blue-600'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatSidebar;
