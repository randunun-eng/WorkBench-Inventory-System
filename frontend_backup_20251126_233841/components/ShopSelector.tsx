import React, { useRef, useState, useMemo } from 'react';
import { ShopProfile } from '../types';
import { ChevronLeft, ChevronRight, Store, Search, MapPin, ArrowUpDown, X } from 'lucide-react';

interface ShopSelectorProps {
  shops: ShopProfile[];
  selectedShopId: string | null;
  onSelectShop: (id: string | null) => void;
}

const ShopSelector: React.FC<ShopSelectorProps> = ({ shops, selectedShopId, onSelectShop }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Extract unique cities dynamically from shop addresses
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    shops.forEach(shop => {
      // Assumes format: "Street, City, State"
      const parts = shop.contact.address.split(',');
      if (parts.length >= 2) {
        // Extract the second to last part (City)
        citySet.add(parts[parts.length - 2].trim());
      }
    });
    return Array.from(citySet).sort();
  }, [shops]);

  // Compute filtered and sorted shops
  const filteredShops = useMemo(() => {
    let result = [...shops];

    // Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(shop => shop.name.toLowerCase().includes(q));
    }

    // Filter by City
    if (selectedCity) {
      result = result.filter(shop => shop.contact.address.includes(selectedCity));
    }

    // Sort
    result.sort((a, b) => {
      const compare = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? compare : -compare;
    });

    return result;
  }, [shops, searchQuery, selectedCity, sortOrder]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCity('');
    setSortOrder('asc');
  };

  return (
    <div className="relative mb-8 mx-4 md:mx-0 group bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-5 gap-4">
        <div>
           <h3 className="font-bold text-brand-dark text-lg flex items-center gap-2">
             <Store className="text-brand-blue" size={20} />
             Find a Workshop
           </h3>
           <p className="text-xs text-gray-500 mt-1">Select a shop to view local inventory</p>
        </div>
        
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
             {/* Search Input */}
             <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                    type="text" 
                    placeholder="Search shop name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-48 pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-gray-50 focus:bg-white transition-colors"
                />
             </div>

             {/* City Dropdown */}
             <div className="relative flex-1 sm:flex-initial">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <select 
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full sm:w-40 pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue appearance-none bg-gray-50 focus:bg-white cursor-pointer transition-colors"
                >
                    <option value="">All Cities</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={12} />
             </div>

             {/* Sort Button */}
             <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 bg-white transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Z-A' : 'A-Z'}`}
             >
                <ArrowUpDown size={14} />
                <span className="font-medium">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
             </button>
             
             {/* Clear Filters Button */}
             {(searchQuery || selectedCity) && (
                 <button 
                    onClick={clearFilters} 
                    className="flex items-center justify-center px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors" 
                    title="Clear Filters"
                 >
                    <X size={18} />
                 </button>
             )}
        </div>
      </div>

      {/* Navigation Arrows (Only visible if needed) */}
       {filteredShops.length > 2 && (
          <>
            <button 
                onClick={() => scroll('left')}
                className="absolute left-2 top-[65%] z-10 bg-white shadow-lg border border-gray-100 p-2 rounded-full text-gray-600 hover:text-brand-blue hover:scale-110 transition-all hidden md:block"
            >
                <ChevronLeft size={20} />
            </button>

            <button 
                onClick={() => scroll('right')}
                className="absolute right-2 top-[65%] z-10 bg-white shadow-lg border border-gray-100 p-2 rounded-full text-gray-600 hover:text-brand-blue hover:scale-110 transition-all hidden md:block"
            >
                <ChevronRight size={20} />
            </button>
          </>
       )}

      {/* Scrollable List */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1 min-h-[140px] items-stretch"
      >
        {/* 'All Inventory' Reset Card - Only show when no filters are active to avoid confusion */}
        {!searchQuery && !selectedCity && (
            <div 
            onClick={() => onSelectShop(null)}
            className={`
                flex-shrink-0 w-32 md:w-36 bg-gray-50 rounded-xl border cursor-pointer transition-all duration-200 p-3 flex flex-col items-center justify-center gap-2 text-center h-40
                ${selectedShopId === null 
                ? 'border-brand-blue ring-2 ring-brand-blue shadow-sm bg-blue-50' 
                : 'border-dashed border-gray-300 hover:border-brand-blue hover:shadow-md'
                }
            `}
            >
                <div className={`p-3 rounded-full ${selectedShopId === null ? 'bg-blue-100 text-brand-blue' : 'bg-white text-gray-400'}`}>
                    <Store size={24} />
                </div>
                <span className={`text-sm font-bold ${selectedShopId === null ? 'text-brand-blue' : 'text-gray-500'}`}>
                    All Inventory
                </span>
            </div>
        )}

        {/* Shop Cards */}
        {filteredShops.map((shop) => (
          <div 
            key={shop.id}
            onClick={() => onSelectShop(shop.id)}
            className={`
              flex-shrink-0 w-60 md:w-64 bg-white rounded-xl border cursor-pointer transition-all duration-200 p-4 flex flex-col h-40 justify-between relative group/card
              ${selectedShopId === shop.id 
                ? 'border-brand-blue ring-2 ring-brand-blue shadow-md' 
                : 'border-gray-200 hover:border-brand-blue hover:shadow-lg'
              }
            `}
          >
            <div className="flex items-start justify-between">
                {/* Shop Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-lg font-bold text-brand-blue border border-blue-200 shadow-sm">
                    {shop.name.charAt(0)}
                </div>
                
                {/* Badges */}
                <div className="text-right flex flex-col items-end">
                    {shop.verified && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold mb-1">
                            Verified
                        </span>
                    )}
                    <div className="text-xs font-medium text-gray-500 flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
                        <span>{shop.rating}</span>
                        <span className="text-yellow-400">★</span>
                    </div>
                </div>
            </div>
            
            <div className="mt-2">
                <h4 className="font-bold text-gray-900 text-sm truncate" title={shop.name}>{shop.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                    <MapPin size={12} className="shrink-0 text-gray-400" />
                    <span className="truncate text-gray-600 font-medium" title={shop.contact.address}>
                        {shop.contact.address.split(',').slice(-2).join(', ')}
                    </span>
                </div>
            </div>
          </div>
        ))}
        
        {/* Empty State */}
        {filteredShops.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Search className="text-gray-300 mb-2" size={24} />
                <p className="text-sm font-medium text-gray-600">No shops found.</p>
                <p className="text-xs text-gray-400">Try adjusting your search or city filter.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ShopSelector;