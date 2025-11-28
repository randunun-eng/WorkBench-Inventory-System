import React, { useState } from 'react';
import { usePresence } from '../../hooks/usePresence';
import { useChatRoom } from '../../hooks/useChatRoom';
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatWindow from '../../components/chat/ChatWindow';

interface ChatProps {
    globalMyShopMessages: any[];
    globalGuestChats: any[];
    setGlobalGuestChats: React.Dispatch<React.SetStateAction<any[]>>;
    setGlobalHasUnreadMyShop: React.Dispatch<React.SetStateAction<boolean>>;
    myShopRoomId: string | null;
    myShopSendMessage: (content: string, type?: 'TEXT' | 'IMAGE', product?: any) => void;
}

const Chat: React.FC<ChatProps> = ({
    globalMyShopMessages,
    globalGuestChats,
    setGlobalGuestChats,
    setGlobalHasUnreadMyShop,
    myShopRoomId,
    myShopSendMessage
}) => {
    const [activeRoomId, setActiveRoomId] = useState<string | null>('general');
    const { onlineUsers, chatHistory: generalMessages, sendMessage: sendGeneralMessage } = usePresence();

    // We still need useChatRoom for the ACTIVE room (if it's not my shop or general)
    // If activeRoomId === myShopRoomId, we use global messages.
    // If activeRoomId === generic room, we need to connect to it to get messages.

    const isMyRoomActive = activeRoomId === myShopRoomId;

    const { messages: activeRoomMessages, sendMessage: activeRoomSendMessage } = useChatRoom(
        (activeRoomId && activeRoomId !== 'general' && !isMyRoomActive) ? activeRoomId : null
    );

    // Determine which messages to show
    let currentMessages: any[] = [];
    let currentSendMessage: ((message: string) => void) | null = null;

    if (activeRoomId === 'general') {
        currentMessages = generalMessages;
        currentSendMessage = sendGeneralMessage;
    } else if (isMyRoomActive) {
        currentMessages = globalMyShopMessages;
        currentSendMessage = myShopSendMessage;
    } else {
        // Guest Room or Other Shop
        currentMessages = activeRoomMessages;
        currentSendMessage = activeRoomSendMessage;
    }

    // Mark as read logic
    React.useEffect(() => {
        if (activeRoomId) {
            if (activeRoomId === myShopRoomId) {
                setGlobalHasUnreadMyShop(false);
            } else if (activeRoomId.includes('-guest-')) {
                setGlobalGuestChats(prev => {
                    const updated = prev.map(c => c.roomId === activeRoomId ? { ...c, hasUnread: false } : c);
                    localStorage.setItem('guest_chats', JSON.stringify(updated));
                    return updated;
                });
            }
        }
    }, [activeRoomId, myShopRoomId, setGlobalHasUnreadMyShop, setGlobalGuestChats]);

    return (
        <div className="flex h-[calc(100vh-64px)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <ChatSidebar
                activeRoomId={activeRoomId}
                onSelectRoom={setActiveRoomId}
                onlineUsers={onlineUsers}
                myShopRoomId={myShopRoomId}
                hasUnreadMyShop={false} // Handled globally now
                guestChats={globalGuestChats}
            />
            <ChatWindow
                roomId={activeRoomId}
                messages={currentMessages}
                onSendMessage={currentSendMessage}
            />
        </div>
    );
};

export default Chat;
