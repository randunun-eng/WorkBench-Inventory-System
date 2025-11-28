import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Save, Lock, MapPin, Phone, Store, Upload, Image as ImageIcon } from 'lucide-react';

const ShopSettings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [shop, setShop] = useState<any>(null);
    const [formData, setFormData] = useState({
        shop_name: '',
        phone: '',
        address: '',
        lat: '',
        lng: '',
        logo_r2_key: ''
    });
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchShop = async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const data = await api.getShopBySlug(user.shop_slug);
            if (data && data.shop) {
                setShop(data.shop);
                setFormData({
                    shop_name: data.shop.shop_name,
                    phone: data.shop.public_contact_info?.phone || '',
                    address: data.shop.location_address || '',
                    lat: data.shop.location_lat?.toString() || '',
                    lng: data.shop.location_lng?.toString() || '',
                    logo_r2_key: data.shop.logo_r2_key || ''
                });
            }
            setLoading(false);
        };
        fetchShop();
    }, []);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        try {
            await api.updateShopProfile({
                shop_name: formData.shop_name,
                contact_info: { phone: formData.phone },
                location: {
                    address: formData.address,
                    lat: parseFloat(formData.lat) || null,
                    lng: parseFloat(formData.lng) || null
                },
                logo_r2_key: formData.logo_r2_key
            });
            setMessage({ type: 'success', text: 'Profile updated successfully' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update profile' });
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { key } = await api.uploadImage(file, false); // Public upload
            setFormData(prev => ({ ...prev, logo_r2_key: key }));
            setMessage({ type: 'success', text: 'Logo uploaded successfully. Click Save to apply.' });
        } catch (error) {
            console.error('Failed to upload logo', error);
            setMessage({ type: 'error', text: 'Failed to upload logo' });
        } finally {
            setIsUploading(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        try {
            await api.updateShopProfile({
                password: passwordData.newPassword
            });
            setMessage({ type: 'success', text: 'Password updated successfully' });
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update password' });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-8">Shop Settings</h1>

            {message.text && (
                <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Settings */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Store size={20} />
                        Profile Details
                    </h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        {/* Logo Upload */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center relative group">
                                {formData.logo_r2_key ? (
                                    <img
                                        src={api.getImageUrl(formData.logo_r2_key)}
                                        alt="Shop Logo"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <ImageIcon className="text-gray-400" size={32} />
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Upload className="text-white" size={20} />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleLogoUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    accept="image/*"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Logo</label>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="text-sm text-brand-blue hover:underline disabled:opacity-50"
                                >
                                    {isUploading ? 'Uploading...' : 'Change Logo'}
                                </button>
                                <p className="text-xs text-gray-500 mt-1">Recommended: Square image, 200x200px</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                            <input
                                type="text"
                                value={formData.shop_name}
                                onChange={e => setFormData({ ...formData, shop_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                                <textarea
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                                <input
                                    type="text"
                                    value={formData.lat}
                                    onChange={e => setFormData({ ...formData, lat: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                                <input
                                    type="text"
                                    value={formData.lng}
                                    onChange={e => setFormData({ ...formData, lng: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            <Save size={18} />
                            Save Changes
                        </button>
                    </form>
                </div>

                {/* Password Settings */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Lock size={20} />
                        Change Password
                    </h2>
                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition-colors"
                        >
                            <Save size={18} />
                            Update Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ShopSettings;
