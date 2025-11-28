import React, { useState, useEffect } from 'react';
import { Search, Menu, MessageCircle, User, LogOut, LayoutDashboard, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  toggleSidebar: () => void;
}

import { api } from '../api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '👋 Welcome to WorkBench! How can I help you find components today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const navigate = useNavigate();

  // Check for logged-in user
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          console.error('Failed to parse user data');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    checkAuth();
    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setUser(null);
    setShowUserMenu(false);
    navigate('/');
    window.location.reload();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to home with search query
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Construct message history for AI
      const messages = chatMessages.map(m => ({ role: m.role, content: m.content }));
      messages.push({ role: 'user', content: userMessage });

      const response = await api.chatWithAI(messages);

      if (response && response.response) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I couldn't process that request." }]);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to the server." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-brand-dark text-white shadow-md border-b border-gray-800">
      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center gap-4 md:gap-8">

          {/* Mobile Menu & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 hover:bg-gray-800 rounded-md text-gray-300"
            >
              <Menu size={24} />
            </button>
            <Link to="/" className="flex flex-col hover:opacity-90 transition-opacity">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">WorkBench</h1>
              <span className="text-[10px] text-blue-400 uppercase tracking-widest hidden md:block">Global Inventory Network</span>
            </Link>
          </div>

          {/* Search Bar - Flex Grow to take available space */}
          <div className="flex-1 max-w-2xl relative hidden md:block">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all shops (e.g., IGBT, Solar Inverter)..."
                className="w-full h-10 px-4 border-2 border-brand-blue bg-white text-gray-900 rounded-l-md focus:outline-none focus:border-blue-400 placeholder-gray-500"
              />
              <button
                type="submit"
                className="bg-brand-blue text-white px-6 h-10 rounded-r-md font-medium hover:bg-blue-600 transition-colors flex items-center justify-center border-2 border-brand-blue"
              >
                <Search size={20} />
              </button>
            </form>
          </div>

          {/* Icons / Actions */}
          <div className="flex items-center gap-4 md:gap-6 ml-auto">

            {/* Home Icon */}
            <Link
              to="/"
              className="flex flex-col items-center cursor-pointer text-gray-300 hover:text-brand-blue transition-colors"
              title="Home"
            >
              <Home size={24} />
              <span className="text-xs mt-1 hidden md:block">Home</span>
            </Link>

            {user ? (
              <div className="relative">
                <div
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="hidden md:flex flex-col items-center cursor-pointer text-gray-300 hover:text-brand-blue transition-colors"
                >
                  <User size={24} />
                  <span className="text-xs mt-1">{user.shop_name || user.email}</span>
                </div>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-200">
                      <p className="font-semibold text-sm">{user.shop_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/dashboard');
                        }}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm"
                      >
                        <LayoutDashboard size={16} />
                        Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm text-red-600"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/join"
                className="hidden md:flex flex-col items-center cursor-pointer text-gray-300 hover:text-brand-blue transition-colors"
              >
                <User size={24} />
                <span className="text-xs mt-1">Shop Login</span>
              </Link>
            )}

            <div className="relative">
              <button
                onClick={() => setShowChatPopup(!showChatPopup)}
                className="flex flex-col items-center cursor-pointer text-gray-300 hover:text-brand-blue transition-colors"
              >
                <MessageCircle size={24} />
                <span className="text-xs mt-1 hidden md:block">Messages</span>
              </button>

              {/* Chat Popup */}
              {showChatPopup && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full right-0 mt-2 w-80 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-200 z-50"
                >
                  <div className="p-4 border-b border-gray-200 bg-brand-dark text-white rounded-t-lg">
                    <h3 className="font-semibold">WorkBench Support</h3>
                    <p className="text-xs text-gray-300">We're here to help!</p>
                  </div>
                  <div className="p-4 h-80 overflow-y-auto flex flex-col gap-3">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user'
                          ? 'bg-brand-blue text-white'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-500 italic">
                          Typing...
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200">
                    <form onSubmit={handleChatSend} className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-blue text-gray-900"
                        disabled={isChatLoading}
                      />
                      <button
                        type="submit"
                        disabled={isChatLoading || !chatInput.trim()}
                        className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search (visible only on small screens) */}
        <div className="mt-3 md:hidden">
          <form onSubmit={handleSearch} className="flex relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              className="w-full h-9 px-3 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:border-brand-blue text-sm placeholder-gray-400"
            />
            <button
              type="submit"
              className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-gray-400 hover:text-brand-blue"
            >
              <Search size={18} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
};

export default Header;