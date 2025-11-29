import React, { useState } from 'react';
import { OnlineUser } from '../../hooks/usePresence';
import { useChatRoom } from '../../hooks/useChatRoom';
import { api, APIShop } from '../../../api';
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatWindow from '../../components/chat/ChatWindow';

interface ChatProps {
    globalMyShopMessages: any[];
    globalGuestChats: any[];
    setGlobalGuestChats: React.Dispatch<React.SetStateAction<any[]>>;
    myShopRoomId: string | null;
    myShopSendMessage: (content: string, type?: 'TEXT' | 'IMAGE', product?: any) => void;
    activeChatRoomId: string | null;
    setActiveChatRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    onlineUsers: OnlineUser[];
    generalMessages: any[];
    sendGeneralMessage: (content: string, type?: 'TEXT' | 'IMAGE', product?: any) => void;
    dmChats: any[];
    setDmChats: React.Dispatch<React.SetStateAction<any[]>>;
}

const Chat: React.FC<ChatProps> = ({
    globalMyShopMessages,
    globalGuestChats,
    setGlobalGuestChats,
    myShopRoomId,
    myShopSendMessage,
    activeChatRoomId,
    setActiveChatRoomId,
    onlineUsers,
    generalMessages,
    sendGeneralMessage,
    dmChats,
    setDmChats
}) => {
    const [activeRoomId, setActiveRoomId] = useState<string | null>(activeChatRoomId || 'general');
    const [shops, setShops] = useState<APIShop[]>([]);
    const [loadingShops, setLoadingShops] = useState(true);

    React.useEffect(() => {
        const fetchShops = async () => {
            try {
                const allShops = await api.getAllShops();
                setShops(allShops);
            } catch (error) {
                console.error('Failed to fetch shops', error);
            } finally {
                setLoadingShops(false);
            }
        };
        fetchShops();
    }, []);

    // We still need useChatRoom for the ACTIVE room (if it's not my shop or general)
    // If activeRoomId === myShopRoomId, we use global messages.
    // If activeRoomId === generic room, we need to connect to it to get messages.

    const isMyRoomActive = activeRoomId === myShopRoomId;

    const { messages: activeRoomMessages, sendMessage: activeRoomSendMessage } = useChatRoom(
        (activeRoomId && activeRoomId !== 'general' && !isMyRoomActive) ? activeRoomId : null
    );

    // Determine which messages to show and unread count
    let currentMessages: any[] = [];
    let currentSendMessage: ((content: string, type?: 'TEXT' | 'IMAGE', product?: any) => void) | null = null;
    let currentUnreadCount = 0;

    if (activeRoomId === 'general') {
        currentMessages = generalMessages;
        currentSendMessage = sendGeneralMessage;
        currentUnreadCount = 0; // General chat doesn't track unread
    } else if (isMyRoomActive) {
        currentMessages = globalMyShopMessages;
        currentSendMessage = myShopSendMessage;
        // Unread count is managed in parent Dashboard component
        currentUnreadCount = 0; // Will be cleared when viewing
    } else if (activeRoomId && activeRoomId.includes('-guest-')) {
        // Guest Room
        currentMessages = activeRoomMessages;
        currentSendMessage = activeRoomSendMessage;
        const guestChat = globalGuestChats.find(c => c.roomId === activeRoomId);
        currentUnreadCount = guestChat?.unreadCount || 0;
    } else {
        // DM or other room
        currentMessages = activeRoomMessages;
        currentSendMessage = activeRoomSendMessage;
        const dmChat = dmChats.find(c => c.roomId === activeRoomId);
        currentUnreadCount = dmChat?.unreadCount || 0;
    }

    // Determine Shop Name for Header
    let activeShopName = '';
    if (activeRoomId === 'general') {
        activeShopName = 'General Chat';
    } else if (activeRoomId) {
        if (activeRoomId.startsWith('dm-')) {
            // DM Room: dm-slug1-slug2
            const parts = activeRoomId.split('-');
            const mySlug = myShopRoomId?.replace('chat-', '');
            // Find the slug that is NOT mine
            const otherSlug = parts.find(p => p !== 'dm' && p !== mySlug);
            const shop = shops.find(s => s.shop_slug === otherSlug);
            activeShopName = shop ? shop.shop_name : 'Direct Message';
        } else {
            // Try to find shop by slug in roomId
            // roomId format: chat-<slug> or chat-<slug>-guest-<id>
            const shop = shops.find(s => activeRoomId.includes(`chat-${s.shop_slug}`));
            if (shop) {
                activeShopName = shop.shop_name;
                if (activeRoomId.includes('-guest-')) {
                    // Find guest name from guestChats
                    const guestChat = globalGuestChats.find(c => c.roomId === activeRoomId);
                    if (guestChat) {
                        activeShopName = `${shop.shop_name} - ${guestChat.guestName || 'Guest'}`;
                    } else {
                        activeShopName = `${shop.shop_name} - Guest Inquiry`;
                    }
                }
            } else {
                activeShopName = activeRoomId;
            }
        }
    }

    // Sync local activeRoomId with parent
    React.useEffect(() => {
        setActiveChatRoomId(activeRoomId);
    }, [activeRoomId, setActiveChatRoomId]);

    // Mark as read logic - Clear unread counts when viewing a chat
    React.useEffect(() => {
        if (activeRoomId) {
            if (activeRoomId === myShopRoomId) {
                // Clear my shop unread count - Logic removed
            } else if (activeRoomId.includes('-guest-')) {
                // Clear guest chat unread count
                setGlobalGuestChats(prev => {
                    const updated = prev.map(c => c.roomId === activeRoomId ? { ...c, unreadCount: 0 } : c);
                    localStorage.setItem('guest_chats', JSON.stringify(updated));
                    return updated;
                });
            } else if (activeRoomId.startsWith('dm-')) {
                // Clear DM room unread count
                // Check if it actually needs clearing to avoid infinite loop if we just set it
                const dmChat = dmChats.find(c => c.roomId === activeRoomId);
                if (dmChat && dmChat.unreadCount > 0) {
                    setDmChats(prev => {
                        const updated = prev.map(c => c.roomId === activeRoomId ? { ...c, unreadCount: 0 } : c);
                        localStorage.setItem('dm_chats', JSON.stringify(updated));
                        return updated;
                    });
                }
            }
        }
    }, [activeRoomId, myShopRoomId, setGlobalGuestChats, dmChats, setDmChats]);

    return (
        <div className="flex h-[calc(100vh-64px)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <ChatSidebar
                activeRoomId={activeRoomId}
                onSelectRoom={setActiveRoomId}
                onlineUsers={onlineUsers}
                myShopRoomId={myShopRoomId}
                guestChats={globalGuestChats}
                dmChats={dmChats}
                shops={shops}
                loading={loadingShops}
            />
            <ChatWindow
                roomId={activeRoomId || ''}
                shopName={activeShopName}
                messages={currentMessages}
                onSendMessage={currentSendMessage}
                unreadCount={currentUnreadCount}
            />
        </div>
    );
};

export default Chat;
