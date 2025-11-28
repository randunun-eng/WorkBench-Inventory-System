import React, { useState } from 'react';
import { usePresence } from '../../hooks/usePresence';
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatWindow from '../../components/chat/ChatWindow';

const Chat: React.FC = () => {
    const [activeRoomId, setActiveRoomId] = useState<string>('general');
    const { onlineUsers, chatHistory, sendMessage } = usePresence();

    return (
        <div className="flex h-[calc(100vh-64px)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <ChatSidebar
                activeRoomId={activeRoomId}
                onSelectRoom={setActiveRoomId}
                onlineUsers={onlineUsers}
            />
            <ChatWindow
                roomId={activeRoomId}
                messages={chatHistory}
                onSendMessage={sendMessage}
            />
        </div>
    );
};

export default Chat;
