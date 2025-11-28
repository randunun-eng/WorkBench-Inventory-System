import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Image, FileText, Package, DollarSign,
  Eye, EyeOff, Upload, X, Save, Search, Filter, History, TrendingUp,
  MessageSquare, Layers, Bot, Store, LogOut, Shield, Settings
} from 'lucide-react';
import InventoryList from '../src/pages/dashboard/InventoryList';
import CategoryList from '../src/pages/dashboard/CategoryList';
import Chat from '../src/pages/dashboard/Chat';
import Network from '../src/pages/dashboard/Network';
import Chatbot from '../src/pages/dashboard/Chatbot';
import VisionTool from '../src/pages/dashboard/VisionTool';
import AdminDashboard from './AdminDashboard';
import ShopSettings from './ShopSettings';
import { api } from '../api';
import { useChatRoom } from '../src/hooks/useChatRoom';

interface InventoryItem {
  id: string;
  category_id: number;
  name: string;
  description: string;
  specifications: any;
  stock_qty: number;
  restock_threshold: number;
  price: number;
  currency: string;
  datasheet_r2_key: string | null;
  primary_image_r2_key: string | null;
  is_public: boolean;
  is_visible_to_network: boolean;
  shareable_qty: number;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    specifications: '',
    stock_qty: '0',
    restock_threshold: '5',
    price: '',
    currency: 'LKR',
    is_public: false,
    is_visible_to_network: false,
    shareable_qty: '0'
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Stock Adjustment State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);

  // History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);

  // View State
  const [activeView, setActiveView] = useState<'inventory' | 'categories' | 'chat' | 'chatbot' | 'network' | 'vision' | 'admin' | 'settings'>('inventory');

  // Category Management State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catFormData, setCatFormData] = useState({
    name: '',
    slug: '',
    parent_id: ''
  });

  const token = localStorage.getItem('auth_token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.email?.toLowerCase() === 'randunun@gmail.com';

  // Global Chat Subscription
  const myShopRoomId = user.shop_slug ? `chat-${user.shop_slug}` : null;
  const { messages: myShopMessages, sendMessage: myShopSendMessage, notifications, isHistoryLoaded } = useChatRoom(myShopRoomId);

  // Guest Chats Management
  const [guestChats, setGuestChats] = useState<any[]>(() => {
    const saved = localStorage.getItem('guest_chats');
    return saved ? JSON.parse(saved) : [];
  });

  // Unread Logic
  const [hasUnreadMyShop, setHasUnreadMyShop] = useState(false);
  const prevMessageCountRef = React.useRef(0);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // Drop to A4

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  // Handle Guest Notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[notifications.length - 1];
      setGuestChats(prev => {
        const exists = prev.find(c => c.roomId === latest.roomId);
        let updated;
        if (exists) {
          updated = prev.map(c => c.roomId === latest.roomId ? { ...c, lastMessage: latest.lastMessage, timestamp: latest.timestamp, hasUnread: true } : c);
        } else {
          updated = [...prev, { ...latest, hasUnread: true }];
        }
        localStorage.setItem('guest_chats', JSON.stringify(updated));
        return updated;
      });

      // Only play sound if we are NOT in the chat view or if the chat view is active but looking at a different room
      // But since this is global, we just play it. The Chat component might also play it? 
      // No, we will remove logic from Chat component.
      playNotificationSound();
    }
  }, [notifications]);

  // Handle My Shop Messages (Unread)
  useEffect(() => {
    // If we are in Chat view AND looking at My Shop, we don't mark as unread
    // But we don't know the active room of the Chat component here easily unless we lift that state too.
    // For now, let's just track "new messages" globally.

    if (isHistoryLoaded) {
      const currentCount = myShopMessages.length;
      const prevCount = prevMessageCountRef.current;

      if (currentCount > prevCount) {
        // If we are NOT in chat view, mark unread
        if (activeView !== 'chat') {
          setHasUnreadMyShop(true);
          playNotificationSound();
        }
      }
      prevMessageCountRef.current = currentCount;
    } else {
      prevMessageCountRef.current = myShopMessages.length;
    }
  }, [myShopMessages.length, isHistoryLoaded, activeView]);

  // Clear unread when entering chat (simplified)
  // Ideally, Chat component tells us when a room is opened.
  // For now, if user clicks "Chat", we can't clear specific room unread yet.
  // We will pass setGuestChats and setHasUnreadMyShop to Chat component.

  useEffect(() => {
    if (!token) {
      navigate('/join');
      return;
    }
    api.setToken(token);
    fetchInventory();
    fetchCategories();
  }, [token]);

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';

      const method = editingCategory ? 'PUT' : 'POST';

      const payload = {
        name: catFormData.name,
        slug: catFormData.slug,
        parent_id: catFormData.parent_id ? parseInt(catFormData.parent_id) : null
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCatFormData({ name: '', slug: '', parent_id: '' });
        fetchCategories();
      } else {
        if (response.status === 401) {
          alert('Session expired. Please login again.');
          navigate('/login');
          return;
        }
        const err = await response.json();
        alert(`Error ${response.status}: ${err.error || JSON.stringify(err)}`);
      }
    } catch (error) {
      console.error('Category save error:', error);
      alert('An unexpected error occurred. See console for details.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchCategories();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete category error:', error);
    }
  };

  const uploadFile = async (file: File, isPrivate: boolean = false, isDatasheet: boolean = false): Promise<{ key: string; extractedSpecs?: any } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isPrivate', isPrivate.toString());
      formData.append('isDatasheet', isDatasheet.toString());

      const response = await fetch('/api/upload/proxy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      return data; // Returns { key, extractedSpecs }
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageKey = null;
      let datasheetKey = null;
      let extractedSpecs = null;

      // Upload files if selected
      if (imageFile) {
        const result = await uploadFile(imageFile, false);
        if (result) imageKey = result.key;
      }
      if (datasheetFile) {
        const result = await uploadFile(datasheetFile, false, true); // isDatasheet = true
        if (result) {
          datasheetKey = result.key;
          extractedSpecs = result.extractedSpecs;
        }
      }

      // Prepare specifications
      let specs = null;

      // Priority: 1. AI Extracted Specs (if new upload), 2. Form Data (manual edits)
      if (extractedSpecs) {
        specs = extractedSpecs;
        // Update form data to show the user (optional, but good for UX if we weren't submitting immediately)
        // But since we are submitting, we just use it in the payload.
        // Ideally, we might want to upload FIRST, show specs, THEN submit. 
        // For now, we'll merge: if user typed something, we keep it? 
        // Actually, let's prioritize the AI specs if they exist, as that's the "magic" feature.
        // Or better: If the user explicitly typed JSON, maybe we should respect it?
        // Let's assume if they uploaded a datasheet, they want the specs from it.

        // If the user ALREADY had specs in the form, we might want to merge.
        if (formData.specifications) {
          try {
            const existingSpecs = JSON.parse(formData.specifications);
            specs = { ...existingSpecs, ...extractedSpecs };
          } catch {
            // If existing wasn't JSON, just use new specs but keep old as note
            specs = { ...extractedSpecs, user_notes: formData.specifications };
          }
        }

        alert('AI successfully extracted specifications from the datasheet!');
      } else if (formData.specifications) {
        try {
          specs = JSON.parse(formData.specifications);
        } catch {
          // If not valid JSON, treat as simple text
          specs = { notes: formData.specifications };
        }
      }

      const payload = {
        category_id: parseInt(formData.category_id),
        name: formData.name,
        description: formData.description,
        specifications: specs,
        stock_qty: parseInt(formData.stock_qty),
        restock_threshold: parseInt(formData.restock_threshold),
        price: parseFloat(formData.price) || null,
        currency: formData.currency,
        is_public: formData.is_public,
        is_visible_to_network: formData.is_visible_to_network,
        shareable_qty: parseInt(formData.shareable_qty),
        primary_image_r2_key: imageKey,
        datasheet_r2_key: datasheetKey
      };

      const url = editingItem
        ? `/api/inventory/${editingItem.id}`
        : '/api/inventory';

      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowAddModal(false);
        setEditingItem(null);
        resetForm();
        fetchInventory();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save item'}\nDetails: ${error.details || ''}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to save item');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchInventory();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleAdjustClick = (item: InventoryItem) => {
    setSelectedItemForAdjust(item);
    setAdjustAmount(0);
    setAdjustReason('');
    setShowAdjustModal(true);
  };

  const submitAdjustment = async () => {
    if (!selectedItemForAdjust || adjustAmount === 0) return;

    try {
      await api.adjustStock(selectedItemForAdjust.id, adjustAmount, adjustReason);
      setShowAdjustModal(false);
      fetchInventory();
    } catch (error: any) {
      console.error('Adjustment error:', error);
      // Try to parse the error message if it's an object
      const errorMessage = error.message || 'Failed to adjust stock';
      const errorDetails = error.details || '';
      alert(`Error: ${errorMessage}\n${errorDetails}`);
    }
  };

  const handleHistoryClick = async (item: InventoryItem) => {
    setSelectedItemForHistory(item);
    setShowHistoryModal(true);
    setLoadingLogs(true);
    try {
      const history = await api.getInventoryLogs(item.id);
      setLogs(history);
    } catch (error) {
      console.error('History error:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      category_id: item.category_id?.toString() || '',
      name: item.name,
      description: item.description || '',
      specifications: item.specifications ? JSON.stringify(item.specifications, null, 2) : '',
      stock_qty: item.stock_qty?.toString() || '0',
      restock_threshold: item.restock_threshold?.toString() || '5',
      price: item.price?.toString() || '',
      currency: item.currency || 'LKR',
      is_public: Boolean(item.is_public),
      is_visible_to_network: Boolean(item.is_visible_to_network),
      shareable_qty: item.shareable_qty?.toString() || '0'
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      category_id: '',
      name: '',
      description: '',
      specifications: '',
      stock_qty: '0',
      restock_threshold: '5',
      price: '',
      currency: 'LKR',
      is_public: false,
      is_visible_to_network: false,
      shareable_qty: '0'
    });
    setImageFile(null);
    setDatasheetFile(null);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryName = (categoryId: number) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Uncategorized';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">WorkBench</h1>
          <p className="text-xs text-gray-500">Shop Owner Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveView('inventory')}
            className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 ${activeView === 'inventory' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Package size={20} /> Products
          </button>
          <button
            onClick={() => setActiveView('categories')}
            className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 ${activeView === 'categories' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Layers size={20} /> Categories
          </button>
          <button
            onClick={() => setActiveView('chat')}
            className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 justify-between ${activeView === 'chat' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={20} /> Chat
            </div>
            {(hasUnreadMyShop || guestChats.some(c => c.hasUnread)) && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveView('chatbot')}
            className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 ${activeView === 'chatbot' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Bot size={20} /> AI Chatbot
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveView('admin')}
              className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 ${activeView === 'admin' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Shield size={20} /> User Management
            </button>
          )}

          <button
            onClick={() => setActiveView('settings')}
            className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 ${activeView === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings size={20} /> Settings
          </button>
        </nav>
        <div className="p-4 border-t space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-2 text-sm text-brand-blue bg-blue-50 hover:bg-blue-100 rounded-md flex items-center gap-2"
          >
            <Store size={16} /> View Public Shop
          </a>
          <button
            onClick={() => {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user');
              window.dispatchEvent(new Event('auth-change'));
              navigate('/login');
            }}
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md text-left flex items-center gap-2"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeView === 'inventory' && 'Inventory Dashboard'}
                  {activeView === 'categories' && 'Category Management'}
                  {activeView === 'chat' && (
                    <Chat
                      globalMyShopMessages={myShopMessages}
                      globalGuestChats={guestChats}
                      setGlobalGuestChats={setGuestChats}
                      setGlobalHasUnreadMyShop={setHasUnreadMyShop}
                      myShopRoomId={myShopRoomId}
                      myShopSendMessage={myShopSendMessage}
                    />
                  )}

                  {activeView === 'network' && (
                    <Network />
                  )}

                  {activeView === 'chatbot' && (
                    <Chatbot />
                  )}

                  {activeView === 'vision' && (
                    <VisionTool />
                  )}

                  {activeView === 'admin' && 'User Management'}
                  {activeView === 'settings' && 'Shop Settings'}
                </h1>
                <p className="text-sm text-gray-600">{user.shop_name || user.email}</p>
              </div>

              {activeView === 'inventory' && (
                <button
                  onClick={() => {
                    setEditingItem(null);
                    resetForm();
                    setShowAddModal(true);
                  }}
                  className="bg-brand-blue text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Item
                </button>
              )}

              {activeView === 'categories' && (
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCatFormData({ name: '', slug: '', parent_id: '' });
                    setShowCategoryModal(true);
                  }}
                  className="bg-brand-blue text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Category
                </button>
              )}
            </div>

            {/* Search Bar (Only for Inventory) */}
            {activeView === 'inventory' && (
              <div className="mt-4 flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search inventory..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {activeView === 'categories' ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.slug}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {categories.find(c => c.id === cat.parent_id)?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCatFormData({
                              name: cat.name,
                              slug: cat.slug,
                              parent_id: cat.parent_id?.toString() || ''
                            });
                            setShowCategoryModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeView === 'inventory' ? (
            /* Inventory List View */
            loading ? (
              <div className="text-center py-20">
                <p className="text-gray-600">Loading inventory...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
                <Package size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No inventory items yet</h3>
                <p className="text-gray-600 mb-6">Start by adding your first inventory item</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-brand-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Item Image */}
                    <div className="h-48 bg-gray-100 flex items-center justify-center">
                      {item.primary_image_r2_key ? (
                        <img
                          src={api.getImageUrl(item.primary_image_r2_key)}
                          alt={item.name}
                          className="w-full h-full object-contain p-2 bg-white"
                        />
                      ) : (
                        <Package size={64} className="text-gray-300" />
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Category:</span>
                          <span className="font-medium">{getCategoryName(item.category_id)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stock:</span>
                          <span className={`font-medium ${item.stock_qty < (item.restock_threshold || 5) ? 'text-red-600' : 'text-green-600'}`}>
                            {item.stock_qty} units
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-medium">{item.currency} {item.price?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {item.is_public ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                              <Eye size={12} /> Public
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded flex items-center gap-1">
                              <EyeOff size={12} /> Private
                            </span>
                          )}
                          {item.datasheet_r2_key && (
                            <a
                              href={api.getImageUrl(item.datasheet_r2_key)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-200 transition-colors"
                            >
                              <FileText size={12} /> Datasheet
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex gap-2">
                      <button
                        onClick={() => handleAdjustClick(item)}
                        className="flex-1 text-xs bg-indigo-50 text-indigo-700 py-2 px-2 rounded hover:bg-indigo-100 flex items-center justify-center gap-1"
                      >
                        <TrendingUp size={14} /> Adjust Stock
                      </button>
                      <button
                        onClick={() => handleHistoryClick(item)}
                        className="flex-1 text-xs bg-gray-50 text-gray-700 py-2 px-2 rounded hover:bg-gray-100 flex items-center justify-center gap-1"
                      >
                        <History size={14} /> History
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeView === 'admin' ? (
            <AdminDashboard />
          ) : activeView === 'settings' ? (
            <ShopSettings />
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-600">Feature coming soon...</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.parent_id ? '  └─ ' : ''}{cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                  placeholder="e.g., IGBT Module 600V 50A"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                  placeholder="Detailed description of the item..."
                />
              </div>

              {/* Price & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                  >
                    <option value="LKR">LKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              {/* Stock Quantity & Restock Threshold */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restock Alert Level</label>
                  <input
                    type="number"
                    value={formData.restock_threshold}
                    onChange={(e) => setFormData({ ...formData, restock_threshold: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Specifications (JSON) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specifications (JSON format)</label>
                <textarea
                  value={formData.specifications}
                  onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue font-mono text-sm"
                  placeholder='{"voltage": "600V", "current": "50A", "package": "TO-247"}'
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                {editingItem?.primary_image_r2_key && !imageFile && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <img
                      src={api.getImageUrl(editingItem.primary_image_r2_key)}
                      alt="Current"
                      className="w-12 h-12 object-cover rounded"
                    />
                    <span className="text-sm text-gray-600">Current Image</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                />
              </div>

              {/* Datasheet Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datasheet (PDF)</label>
                {editingItem?.datasheet_r2_key && !datasheetFile && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <FileText size={20} className="text-red-500" />
                    <span className="text-sm text-gray-600">Current Datasheet Attached</span>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setDatasheetFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                />
              </div>

              {/* Visibility Options */}
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4 text-brand-blue rounded focus:ring-brand-blue"
                  />
                  <span className="text-sm text-gray-700">Make this item public (visible to all users)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_visible_to_network}
                    onChange={(e) => setFormData({ ...formData, is_visible_to_network: e.target.checked })}
                    className="w-4 h-4 text-brand-blue rounded focus:ring-brand-blue"
                  />
                  <span className="text-sm text-gray-700">Share with network partners</span>
                </label>

                {formData.is_visible_to_network && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shareable Quantity</label>
                    <input
                      type="number"
                      value={formData.shareable_qty}
                      onChange={(e) => setFormData({ ...formData, shareable_qty: e.target.value })}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-brand-blue text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {uploading ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Adjust Stock: {selectedItemForAdjust?.name}</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Change Amount (+/-)</label>
              <input
                type="number"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">Positive to add, negative to remove.</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="e.g. Restock, Damaged"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={submitAdjustment}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Stock History: {selectedItemForHistory?.name}</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingLogs ? (
                <p>Loading history...</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Change</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">New Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-2 text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                        <td className={`px-4 py-2 text-sm font-bold ${log.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{log.new_qty}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{log.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <form onSubmit={handleCategorySubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Slug</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={catFormData.slug}
                  onChange={(e) => setCatFormData({ ...catFormData, slug: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Parent Category</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={catFormData.parent_id}
                  onChange={(e) => setCatFormData({ ...catFormData, parent_id: e.target.value })}
                >
                  <option value="">None (Top Level)</option>
                  {categories.filter(c => c.id !== editingCategory?.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
