import React from 'react';
import { Search, Menu, MessageCircle, User } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
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
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">WorkBench</h1>
              <span className="text-[10px] text-blue-400 uppercase tracking-widest hidden md:block">Global Inventory Network</span>
            </div>
          </div>

          {/* Search Bar - Flex Grow to take available space */}
          <div className="flex-1 max-w-2xl relative hidden md:block">
            <div className="flex">
              <input 
                type="text" 
                placeholder="Search across all shops (e.g., IGBT, Solar Inverter)..." 
                className="w-full h-10 px-4 border-2 border-brand-blue bg-white text-gray-900 rounded-l-md focus:outline-none focus:border-blue-400 placeholder-gray-500"
              />
              <button className="bg-brand-blue text-white px-6 h-10 rounded-r-md font-medium hover:bg-blue-600 transition-colors flex items-center justify-center border-2 border-brand-blue">
                <Search size={20} />
              </button>
            </div>
          </div>

          {/* Icons / Actions */}
          <div className="flex items-center gap-4 md:gap-6 ml-auto">
            <div className="hidden md:flex flex-col items-center cursor-pointer text-gray-300 hover:text-brand-blue transition-colors">
              <User size={24} />
              <span className="text-xs mt-1">Shop Login</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer text-gray-300 hover:text-brand-blue transition-colors relative">
              <MessageCircle size={24} />
              <span className="text-xs mt-1 hidden md:block">Messages</span>
            </div>
          </div>
        </div>

        {/* Mobile Search (visible only on small screens) */}
        <div className="mt-3 md:hidden">
          <div className="flex relative">
             <input 
                type="text" 
                placeholder="Search components..." 
                className="w-full h-9 px-3 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:border-brand-blue text-sm placeholder-gray-400"
              />
              <button className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-gray-400">
                <Search size={18} />
              </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;