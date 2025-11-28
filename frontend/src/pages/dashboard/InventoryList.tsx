import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../api';
import { Plus, Search, Filter, Edit, Trash2, MoreVertical, Package, Sparkles, Upload, ScanLine } from 'lucide-react';
import BarcodeScanner from '../../components/BarcodeScanner';

const InventoryList: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        price: '',
        landing_cost: '',
        stock_qty: '',
        sku: '',
        category_id: '',
        specifications: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            api.getCategories().then(setCategories).catch(console.error);
        }
    }, [isModalOpen]);

    const loadData = async () => {
        try {
            const [itemsData, categoriesData] = await Promise.all([
                api.getInventory(),
                api.getCategories()
            ]);
            setItems(itemsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    const loadItems = async () => {
        try {
            const data = await api.getInventory();
            setItems(data);
        } catch (error) {
            console.error('Failed to load inventory', error);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let specs = null;
            try {
                if (newItem.specifications) {
                    specs = JSON.parse(newItem.specifications);
                }
            } catch (e) {
                alert('Invalid JSON in specifications');
                return;
            }

            await api.createItem({
                ...newItem,
                price: parseFloat(newItem.price),
                landing_cost: newItem.landing_cost ? parseFloat(newItem.landing_cost) : undefined,
                stock_qty: parseInt(newItem.stock_qty),
                specifications: specs
            });
            setIsModalOpen(false);
            setNewItem({ name: '', description: '', price: '', landing_cost: '', stock_qty: '', sku: '', category_id: '', specifications: '' });
            loadItems();
        } catch (error) {
            alert('Failed to create item');
        }
    };

    // ... (handleAIUpload remains same) ...

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-white rounded-lg shadow relative">
            <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">Inventory Items</h2>

                <div className="flex gap-2 w-full md:w-auto">
                    {/* ... (search and buttons remain same) ... */}
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search name or SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                        title="Scan Barcode"
                    >
                        <ScanLine size={20} />
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-brand-blue text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors whitespace-nowrap"
                    >
                        <Plus size={20} />
                        Add Item
                    </button>
                </div>
            </div>
            <div className="p-6">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-100 text-gray-500 text-sm">
                            <th className="pb-3 font-medium">Name</th>
                            <th className="pb-3 font-medium">SKU</th>
                            <th className="pb-3 font-medium">Category</th>
                            <th className="pb-3 font-medium">Stock</th>
                            <th className="pb-3 font-medium">Price</th>
                            <th className="pb-3 font-medium">Cost</th>
                            <th className="pb-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((item) => (
                            <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="py-4 font-medium text-gray-800">{item.name}</td>
                                <td className="py-4 text-gray-600">{item.sku || '-'}</td>
                                <td className="py-4 text-gray-600">{item.category_name || 'Uncategorized'}</td>
                                <td className="py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.stock_qty > 10 ? 'bg-green-100 text-green-700' :
                                        item.stock_qty > 0 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                        {item.stock_qty} in stock
                                    </span>
                                </td>
                                <td className="py-4 text-gray-800">${item.price}</td>
                                <td className="py-4 text-gray-500 text-sm">{item.landing_cost ? `$${item.landing_cost}` : '-'}</td>
                                <td className="py-4">
                                    <button className="text-gray-400 hover:text-brand-blue">
                                        <Edit size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Item Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Add New Item</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        {/* AI Auto-Fill Section */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-brand-blue font-medium">
                                    <Sparkles size={20} />
                                    <span>Auto-fill from Datasheet</span>
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isProcessingAI}
                                    className="text-sm bg-white border border-blue-200 text-brand-blue px-3 py-1 rounded hover:bg-blue-50 flex items-center gap-2"
                                >
                                    {isProcessingAI ? 'Analyzing...' : (
                                        <>
                                            <Upload size={14} />
                                            Upload Image
                                        </>
                                    )}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleAIUpload}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                                Upload a photo of a datasheet or product label to automatically extract details.
                            </p>
                        </div>

                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={newItem.category_id}
                                    onChange={e => setNewItem({ ...newItem, category_id: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="">Select Category</option>
                                    {/* Render flattened tree */}
                                    {(() => {
                                        const buildOptions = (parentId: number | null = null, depth = 0) => {
                                            return categories
                                                .filter(c => c.parent_id == parentId) // Loose equality for null/undefined/0 safety
                                                .map(c => (
                                                    <React.Fragment key={c.id}>
                                                        <option value={c.id}>
                                                            {'\u00A0'.repeat(depth * 4)}{c.name}
                                                        </option>
                                                        {buildOptions(c.id, depth + 1)}
                                                    </React.Fragment>
                                                ));
                                        };
                                        return buildOptions();
                                    })()}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={newItem.price}
                                        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Landing Cost (Private)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newItem.landing_cost}
                                        onChange={e => setNewItem({ ...newItem, landing_cost: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                                    <input
                                        type="number"
                                        required
                                        value={newItem.stock_qty}
                                        onChange={e => setNewItem({ ...newItem, stock_qty: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Specifications (JSON format)</label>
                                <textarea
                                    value={newItem.specifications}
                                    onChange={e => setNewItem({ ...newItem, specifications: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                                    rows={3}
                                    placeholder='{"voltage": "12V", "current": "1A"}'
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600"
                                >
                                    Create Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Barcode Scanner Modal */}
            {isScannerOpen && (
                <BarcodeScanner
                    onScanSuccess={(decodedText) => {
                        setSearchQuery(decodedText);
                        setIsScannerOpen(false);
                    }}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}
        </div>
    );
};

export default InventoryList;
