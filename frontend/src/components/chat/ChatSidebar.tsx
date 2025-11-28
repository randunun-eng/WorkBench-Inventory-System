import React, { useState, useEffect } from 'react';
import { MessageCircle, Users, Hash, Circle } from 'lucide-react';
import { OnlineUser } from '../../hooks/usePresence';

interface ChatSidebarProps {
    activeRoomId: string | null;
    onSelectRoom: (roomId: string) => void;
    onlineUsers: OnlineUser[];
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ activeRoomId, onSelectRoom, onlineUsers }) => {
    // const { onlineUsers } = usePresence(); // Removed internal hook usage
    const [shops, setShops] = useState<APIShop[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const allShops = await api.getAllShops();
                // Filter out current user's shop if possible, but for now show all
                setShops(allShops);
            } catch (error) {
                console.error('Failed to fetch shops', error);
            } finally {
                setLoading(false);
            }
        };
        fetchShops();
    }, []);

    // Helper to check if a shop is online
    // We match by username (shop name) or we need a better ID match.
    // PresenceRegistry uses userId (uid). APIShop has id (slug).
    // This is a mismatch. Ideally we should use userId everywhere.
    // For this MVP, we'll rely on the username broadcasted by PresenceRegistry matching shop_name.
    const isOnline = (shopName: string) => {
        return onlineUsers.some(u => u.username === shopName && u.status === 'ONLINE');
    };

    const handleShopClick = (shop: APIShop) => {
        // Create a consistent room ID for DM
        // For simplicity, we'll just use the shop slug as a room for now, 
        // effectively making it a "Shop Public Channel". 
        // Real DMs would require sorting user IDs: `dm-${[uid1, uid2].sort().join('-')}`
        // But we don't have the other user's UID easily here without more API work.
        // So let's use `chat-${shop.shop_slug}` which acts as that shop's channel.
        onSelectRoom(`chat-${shop.shop_slug}`);
    };

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <MessageCircle size={20} className="text-brand-blue" />
                    Network Chat
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Active Shops</h3>
                    {loading ? (
                        <div className="px-3 text-sm text-gray-400">Loading network...</div>
                    ) : (
                        shops.map(shop => {
                            const online = isOnline(shop.shop_name);
                            const roomId = `chat-${shop.shop_slug}`;
                            return (
                                <button
                                    key={shop.id}
                                    onClick={() => handleShopClick(shop)}
                                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm transition-colors ${activeRoomId === roomId
                                        ? 'bg-blue-50 text-brand-blue font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`relative`}>
                                        <Users size={16} className="text-gray-400" />
                                        <span className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white ${online ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                    </div>
                                    <span className="truncate">{shop.shop_name}</span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Channels</h3>
                    <button
                        onClick={() => onSelectRoom('general')}
                        className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm transition-colors ${activeRoomId === 'general'
                            ? 'bg-blue-50 text-brand-blue font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Hash size={16} className="text-gray-400" />
                        General
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatSidebar;
