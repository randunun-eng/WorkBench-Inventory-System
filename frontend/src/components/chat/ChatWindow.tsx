import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Image as ImageIcon, Smile, FileText } from 'lucide-react';
import { api } from '../../../api';
import { ChatMessage } from '../../hooks/usePresence';

interface ChatWindowProps {
    roomId: string;
    messages: ChatMessage[];
    onSendMessage: (content: string, type?: 'TEXT' | 'IMAGE', product?: any) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ roomId, messages, onSendMessage }) => {
    const [input, setInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Simple user check
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const currentUserId = user.uid || user.id; // Support both uid and id

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input, 'TEXT');
            setInput('');
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { key } = await api.uploadImage(file, false); // Public upload for chat
            onSendMessage(key, 'IMAGE');
        } catch (error) {
            console.error('Failed to upload file', error);
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const renderMessageContent = (msg: ChatMessage) => {
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

        return <div className="text-sm break-words">{msg.content}</div>;
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
                <div>
                    <h2 className="font-bold text-gray-800">#{roomId}</h2>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUserId;

                    return (
                        <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] ${isMe ? 'bg-brand-blue text-white' : 'bg-white border border-gray-200'} rounded-lg p-3 shadow-sm`}>
                                {!isMe && <div className="text-xs font-bold text-gray-500 mb-1">{msg.senderName}</div>}

                                {/* Product Tag */}
                                {msg.product && (
                                    <div className="mb-2 pb-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50 p-2 rounded">
                                        <div className="w-10 h-10 rounded bg-white overflow-hidden shrink-0 border border-gray-200">
                                            <img src={msg.product.image} className="w-full h-full object-cover" alt={msg.product.name} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Inquiring about</div>
                                            <div className="font-bold truncate text-xs text-gray-800">{msg.product.name}</div>
                                            <div className="text-[10px] text-brand-blue">{msg.product.price}</div>
                                        </div>
                                    </div>
                                )}

                                {renderMessageContent(msg)}
                                <div className={`text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'} text-right`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*"
                    />
                    <button
                        type="button"
                        onClick={triggerFileUpload}
                        disabled={isUploading}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 disabled:opacity-50"
                    >
                        <Paperclip size={20} />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isUploading ? "Uploading..." : "Type a message..."}
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                        disabled={isUploading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isUploading}
                        className="bg-brand-blue text-white p-2 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
