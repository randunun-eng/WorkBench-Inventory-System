import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../../api';
import { Send, Bot, User, Sparkles, Search, FileText } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    searchResults?: any[];
}

const Chatbot: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am WorkBench AI. I can help you find parts, check stock, or answer technical questions. How can I assist you today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Prepare history for API (exclude search results from context to save tokens if needed, 
            // but here we send everything for context)
            const apiMessages = [...messages, userMessage].map(m => ({
                role: m.role,
                content: m.content
            }));

            const data = await api.chatWithAI(apiMessages);

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.response,
                searchResults: data.results
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('AI Chat failed', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-lg shadow overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center gap-3 text-white">
                <div className="bg-white/20 p-2 rounded-full">
                    <Bot size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-lg">WorkBench AI Assistant</h2>
                    <p className="text-xs text-indigo-100 flex items-center gap-1">
                        <Sparkles size={12} />
                        Powered by Llama 3
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600">
                                <Bot size={18} />
                            </div>
                        )}

                        <div className={`max-w-[80%] space-y-2`}>
                            <div className={`p-4 rounded-2xl shadow-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                }`}>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                            </div>

                            {/* Search Results Card */}
                            {msg.searchResults && msg.searchResults.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-2">
                                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <Search size={12} />
                                        Database Results
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {msg.searchResults.map((item: any, i: number) => (
                                            <div key={i} className="p-3 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-medium text-gray-800 text-sm">{item.name}</h4>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.stock_qty > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {item.stock_qty || 0} in stock
                                                    </span>
                                                </div>
                                                {item.description && (
                                                    <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                                                )}
                                                <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
                                                    <div className="flex gap-2">
                                                        <span>{item.price ? `${item.currency || '$'}${item.price}` : 'Price N/A'}</span>
                                                        {item.datasheet_r2_key && (
                                                            <a
                                                                href={`/api/images/${item.datasheet_r2_key}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                                            >
                                                                <FileText size={12} />
                                                                Datasheet
                                                            </a>
                                                        )}
                                                    </div>
                                                    {item.shop_name && (
                                                        <span className="text-xs text-gray-400">by {item.shop_name}</span>
                                                    )}
                                                </div>
                                                {item.datasheet_analysis && (
                                                    <details className="mt-2">
                                                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                                            📋 View Technical Specifications
                                                        </summary>
                                                        <div className="mt-2 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg text-xs text-gray-800 border border-blue-100">
                                                            {typeof item.datasheet_analysis === 'object' && item.datasheet_analysis !== null && !Array.isArray(item.datasheet_analysis) ? (
                                                                <div className="space-y-2">
                                                                    {item.datasheet_analysis.part_number && (
                                                                        <div><span className="font-semibold">Part Number:</span> {item.datasheet_analysis.part_number}</div>
                                                                    )}
                                                                    {item.datasheet_analysis.type && (
                                                                        <div><span className="font-semibold">Type:</span> {item.datasheet_analysis.type}</div>
                                                                    )}
                                                                    {item.datasheet_analysis.voltage_rating && (
                                                                        <div><span className="font-semibold">Voltage Rating:</span> {item.datasheet_analysis.voltage_rating}</div>
                                                                    )}
                                                                    {item.datasheet_analysis.current_rating && (
                                                                        <div><span className="font-semibold">Current Rating:</span> {item.datasheet_analysis.current_rating}</div>
                                                                    )}
                                                                    {item.datasheet_analysis.power_rating && (
                                                                        <div><span className="font-semibold">Power Rating:</span> {item.datasheet_analysis.power_rating}</div>
                                                                    )}
                                                                    {item.datasheet_analysis.key_parameters && Array.isArray(item.datasheet_analysis.key_parameters) && (
                                                                        <div>
                                                                            <span className="font-semibold">Key Parameters:</span>
                                                                            <ul className="ml-4 mt-1 list-disc">
                                                                                {item.datasheet_analysis.key_parameters.map((param: string, idx: number) => (
                                                                                    <li key={idx}>{param}</li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                    {item.datasheet_analysis.applications && Array.isArray(item.datasheet_analysis.applications) && (
                                                                        <div>
                                                                            <span className="font-semibold">Applications:</span>
                                                                            <ul className="ml-4 mt-1 list-disc">
                                                                                {item.datasheet_analysis.applications.map((app: string, idx: number) => (
                                                                                    <li key={idx}>{app}</li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                    {item.datasheet_analysis.manufacturer && (
                                                                        <div><span className="font-semibold">Manufacturer:</span> {item.datasheet_analysis.manufacturer}</div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="whitespace-pre-wrap">{item.datasheet_analysis}</div>
                                                            )}
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-500">
                                <User size={18} />
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600">
                            <Bot size={18} />
                        </div>
                        <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleSend} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about inventory, specs, or general questions..."
                        className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chatbot;
