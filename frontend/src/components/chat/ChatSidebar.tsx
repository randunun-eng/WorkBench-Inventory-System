import React, { useState, useEffect } from 'react';
import { MessageCircle, Users, Hash, Circle, User } from 'lucide-react';
import { OnlineUser } from '../../hooks/usePresence';
import { api, APIShop } from '../../../api';

interface ChatSidebarProps {
    activeRoomId: string | null;
    onSelectRoom: (roomId: string) => void;
    onlineUsers: OnlineUser[];
    myShopRoomId?: string | null;
    hasUnreadMyShop?: boolean;
    guestChats?: any[];
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ activeRoomId, onSelectRoom, onlineUsers, myShopRoomId, hasUnreadMyShop, guestChats = [] }) => {
    const [shops, setShops] = useState<APIShop[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const allShops = await api.getAllShops();
                setShops(allShops);
            } catch (error) {
                console.error('Failed to fetch shops', error);
            } finally {
                setLoading(false);
            }
        };
        fetchShops();
    }, []);

    const isOnline = (username: string) => {
        return onlineUsers.some(u => u.username === username && u.status === 'ONLINE');
    };

    const handleShopClick = (shop: APIShop) => {
        onSelectRoom(`chat-${shop.shop_slug}`);
    };

    // Filter online users who are NOT in the shops list (e.g. Admins, Guests)
    const otherOnlineUsers = onlineUsers.filter(u =>
        !shops.some(s => s.shop_name === u.username)
    );

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <MessageCircle size={20} className="text-brand-blue" />
                    Network Chat
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {/* Channels */}
                {/* Channels */}
                {/* <div className="mb-6">
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
                </div> */}

                {/* My Shop */}
                {myShopRoomId && (
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">My Inbox</h3>
                        {shops.filter(s => s.shop_slug && `chat-${s.shop_slug}` === myShopRoomId).map(shop => (
                            <button
                                key={shop.id}
                                onClick={() => handleShopClick(shop)}
                                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm transition-colors ${activeRoomId === myShopRoomId
                                    ? 'bg-blue-50 text-brand-blue font-medium'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <div className={`relative shrink-0`}>
                                    {shop.logo_r2_key ? (
                                        <img
                                            src={api.getImageUrl(shop.logo_r2_key)}
                                            alt={shop.shop_name}
                                            className="w-6 h-6 rounded-full object-cover border border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Users size={14} className="text-gray-400" />
                                        </div>
                                    )}
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white bg-green-500`}></span>
                                </div>
                                <span className="truncate">{shop.shop_name}</span>
                                {/* Unread Badge */}
                                {hasUnreadMyShop && (
                                    <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Customer Inquiries */}
                {guestChats.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Customer Inquiries</h3>
                        {guestChats.map((chat, index) => (
                            <button
                                key={chat.roomId || index}
                                onClick={() => onSelectRoom(chat.roomId)}
                                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm transition-colors ${activeRoomId === chat.roomId
                                    ? 'bg-blue-50 text-brand-blue font-medium'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="relative shrink-0">
                                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                                        <User size={14} className="text-orange-500" />
                                    </div>
                                    {/* Online indicator could be added if we tracked guest presence */}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">{chat.guestName || 'Guest'}</div>
                                    <div className="truncate text-xs text-gray-400">{chat.lastMessage}</div>
                                </div>
                                {/* Unread Badge */}
                                {chat.hasUnread && (
                                    <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Active Shops (Others) */}
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Active Shops</h3>
                    {loading ? (
                        <div className="px-3 text-sm text-gray-400">Loading network...</div>
                    ) : (
                        shops
                            .filter(shop => !myShopRoomId || (shop.shop_slug && `chat-${shop.shop_slug}` !== myShopRoomId))
                            .map(shop => {
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
                                        <div className={`relative shrink-0`}>
                                            {shop.logo_r2_key ? (
                                                <img
                                                    src={api.getImageUrl(shop.logo_r2_key)}
                                                    alt={shop.shop_name}
                                                    className="w-6 h-6 rounded-full object-cover border border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <Users size={14} className="text-gray-400" />
                                                </div>
                                            )}
                                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${online ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                        </div>
                                        <span className="truncate">{shop.shop_name}</span>
                                    </button>
                                );
                            })
                    )}
                </div>

                {/* Online Users (Admins, Guests) */}
                {otherOnlineUsers.length > 0 && (
                    <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Online Users</h3>
                        {otherOnlineUsers.map(user => (
                            <div key={user.userId} className="px-3 py-2 flex items-center gap-2 text-sm text-gray-700">
                                <div className="relative">
                                    <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center border border-purple-100">
                                        <User size={14} className="text-purple-400" />
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white bg-green-500"></span>
                                </div>
                                <span className="truncate">{user.username}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;
