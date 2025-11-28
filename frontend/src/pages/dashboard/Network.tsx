import React, { useState } from 'react';
import { api } from '../../../api';
import { Search, MessageCircle, MapPin, Store, FileText, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Network: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    // In a real app, we'd use a router hook or context to switch tabs
    // For this MVP, we might need to pass a prop or use a global state to switch to 'chat' view
    // But since Dashboard manages views, we can't easily switch view from here without a callback.
    // We'll just alert for now or assume the user navigates manually.
    // Ideally, we passed `onNavigate` prop.

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setHasSearched(true);
        try {
            const data = await api.searchNetwork(query);
            setResults(data);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMessageShop = (shopSlug: string) => {
        // In a real implementation, this would:
        // 1. Create a new chat room (or find existing) with this shop owner
        // 2. Navigate to the Chat view
        // 3. Select that room

        // For MVP, we'll just show an alert explaining what would happen
        alert(`Starting chat with ${shopSlug}... (Feature: Auto-create room & navigate)`);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Store className="text-brand-blue" />
                    Network Search
                </h2>
                <p className="text-gray-600 mb-6">
                    Find parts and inventory from other repair shops in the WorkBench network.
                </p>

                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for parts (e.g., 'iPhone 13 Screen', 'HDMI Port')..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-brand-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Searching...' : 'Search Network'}
                    </button>
                </form>
            </div>

            {hasSearched && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-700">
                            {results.length} Result{results.length !== 1 && 's'} Found
                        </h3>
                    </div>

                    {results.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No items found matching "{query}" in the network.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {results.map((item) => (
                                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                    <div className="flex gap-4">
                                        {/* Item Image */}
                                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center border border-gray-200">
                                            {item.primary_image_r2_key ? (
                                                <img
                                                    src={`/api/images/${item.primary_image_r2_key}`}
                                                    alt={item.name}
                                                    className="w-full h-full object-contain p-1 bg-white rounded-lg"
                                                />
                                            ) : (
                                                <Package size={32} className="text-gray-300" />
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                                            <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Store size={14} />
                                                    {item.shop_name}
                                                </span>
                                                {item.stock_qty && (
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                                        {item.stock_qty} in stock
                                                    </span>
                                                )}
                                                {item.datasheet_r2_key && (
                                                    <a
                                                        href={`/api/images/${item.datasheet_r2_key}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        <FileText size={14} />
                                                        Datasheet
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleMessageShop(item.shop_slug)}
                                        className="flex items-center gap-2 px-4 py-2 border border-brand-blue text-brand-blue rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                                    >
                                        <MessageCircle size={18} />
                                        Message Shop
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Network;
