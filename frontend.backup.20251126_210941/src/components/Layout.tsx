
import React, { useState } from 'react';


interface LayoutProps {
    children: React.ReactNode;
    onSearch?: (query: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onSearch }) => {
    const [searchInput, setSearchInput] = useState('');
    return (
        <div className="min-h-screen bg-gray-100 font-sans text-sm">
            {/* Top Utility Bar */}
            <div className="bg-gray-900 text-white text-xs py-1">
                <div className="max-w-[1200px] mx-auto px-4 flex justify-between items-center">
                    <div className="flex space-x-4 items-center">
                        {/* Login / Join - Top Left as requested */}
                        <div className="flex items-center space-x-2 border-r border-gray-700 pr-4 mr-2">
                            <span className="text-orange-400 font-bold cursor-pointer hover:text-orange-300">Sign in</span>
                            <span>|</span>
                            <span className="cursor-pointer hover:text-gray-300">Join</span>
                        </div>
                        <span className="cursor-pointer hover:underline hidden sm:inline">Sell on WorkBench</span>
                        <span className="cursor-pointer hover:underline hidden sm:inline">Help Center</span>
                    </div>
                    <div className="flex space-x-4">
                        <span className="cursor-pointer hover:underline">Ship to: 🇺🇸 / USD</span>
                        <span className="cursor-pointer hover:underline">App</span>
                    </div>
                </div>
            </div>

            {/* Main Header - Compacted py-2 instead of py-4 */}
            <header className="bg-white shadow-sm sticky top-0 z-50 py-2">
                <div className="max-w-[1200px] mx-auto px-4 flex items-center gap-4 sm:gap-8">
                    {/* Logo */}
                    <a href="/" className="text-3xl font-bold text-orange-600 tracking-tight shrink-0">
                        WorkBench
                    </a>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-2xl relative">
                        <div className="flex border-2 border-orange-600 rounded-md overflow-hidden">
                            <input
                                type="text"
                                placeholder="I'm shopping for..."
                                className="flex-1 px-4 py-2 outline-none text-gray-700"
                                value={searchInput}
                                onChange={(e) => {
                                    setSearchInput(e.target.value);
                                    onSearch?.(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onSearch?.(searchInput);
                                    }
                                }}
                            />
                            <button
                                onClick={() => onSearch?.(searchInput)}
                                className="bg-orange-600 text-white px-6 py-2 font-bold hover:bg-orange-700 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center gap-6 shrink-0 text-gray-700">
                        <div className="flex flex-col items-center cursor-pointer hover:text-orange-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-xs mt-1">Account</span>
                        </div>
                        <div className="flex flex-col items-center cursor-pointer hover:text-orange-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className="text-xs mt-1">Wishlist</span>
                        </div>
                        <div className="flex flex-col items-center cursor-pointer hover:text-orange-600 relative">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-xs mt-1">Cart</span>
                            <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">2</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1200px] mx-auto px-4 py-6 w-full">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12 pt-12 pb-8">
                <div className="max-w-[1200px] mx-auto px-4 grid grid-cols-4 gap-8 text-gray-600 text-xs">
                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">Customer Service</h4>
                        <ul className="space-y-2">
                            <li>Help Center</li>
                            <li>Transaction Services</li>
                            <li>Contact Us</li>
                            <li>Terms & Conditions</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">Shopping with us</h4>
                        <ul className="space-y-2">
                            <li>Making Payments</li>
                            <li>Delivery Options</li>
                            <li>Buyer Protection</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">Collaborate with us</h4>
                        <ul className="space-y-2">
                            <li>Partnerships</li>
                            <li>Affiliate Program</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">Stay Connected</h4>
                        <div className="flex space-x-4">
                            {/* Social Icons Placeholder */}
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        </div>
                    </div>
                </div>
                <div className="max-w-[1200px] mx-auto px-4 mt-12 pt-8 border-t border-gray-100 text-center text-gray-400">
                    &copy; {new Date().getFullYear()} WorkBench Inventory System. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default Layout;
