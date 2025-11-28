import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import { Plus, Folder, ChevronRight, ChevronDown } from 'lucide-react';

const CategoryList: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await api.getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Categories</h2>
                <button className="bg-brand-blue text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors">
                    <Plus size={20} />
                    Add Category
                </button>
            </div>
            <div className="p-6">
                <div className="space-y-2">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg border border-gray-100">
                            <Folder size={20} className="text-brand-blue" />
                            <span className="font-medium text-gray-700">{cat.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoryList;
