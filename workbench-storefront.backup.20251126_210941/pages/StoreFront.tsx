import React, { useState } from 'react';
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_SHOPS } from '../mockData';
import CategorySidebar from '../components/CategorySidebar';
import ProductCard from '../components/ProductCard';
import ShopSelector from '../components/ShopSelector';
import { Filter, ChevronDown, ShoppingBag } from 'lucide-react';

interface StoreFrontProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

const StoreFront: React.FC<StoreFrontProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);

  // Filter products based on active category AND active shop
  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    const matchesCategory = activeCategoryId 
        ? (p.categoryId === activeCategoryId || p.categoryId.startsWith(activeCategoryId))
        : true;
    
    const matchesShop = activeShopId
        ? p.shopId === activeShopId
        : true;

    return matchesCategory && matchesShop;
  });

  const selectedShop = activeShopId ? MOCK_SHOPS.find(s => s.id === activeShopId) : null;

  return (
    <div className="flex max-w-7xl mx-auto items-start gap-6 pt-4 px-0 md:px-4">
      {/* Sidebar */}
      <CategorySidebar 
        categories={MOCK_CATEGORIES} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeCategoryId={activeCategoryId}
        onSelectCategory={(id) => {
            setActiveCategoryId(id);
            setSidebarOpen(false); // Close on mobile selection
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        
        {/* Banner (only on 'Home' when no specific shop selected) */}
        {!activeCategoryId && !activeShopId && (
          <div className="bg-gradient-to-r from-brand-dark to-blue-900 rounded-none md:rounded-xl overflow-hidden mb-8 text-white p-6 md:p-10 shadow-lg mx-4 md:mx-0 relative">
            <div className="max-w-xl relative z-10">
              <h2 className="text-2xl md:text-4xl font-bold mb-4">Find Industrial Components Nearby</h2>
              <p className="text-blue-100 mb-6 text-sm md:text-base">
                Locate switch gears, semiconductors, and solar infrastructure available in stock at partner shops.
              </p>
              <button className="bg-brand-blue text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-900/50">
                Browse Inventory
              </button>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/5 to-transparent hidden md:block"></div>
          </div>
        )}

        {/* Shop Selector Section */}
        <ShopSelector 
            shops={MOCK_SHOPS} 
            selectedShopId={activeShopId} 
            onSelectShop={setActiveShopId} 
        />

        {/* Toolbar */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-4 flex justify-between items-center mx-4 md:mx-0 sticky top-[72px] z-20 md:static">
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-sm text-gray-600">
                <span className="font-medium text-gray-900 flex items-center gap-2">
                    {activeShopId ? (
                        <>
                            <span className="text-brand-blue">{selectedShop?.name}</span>
                            <span className="text-gray-400">/</span>
                        </>
                    ) : null}
                    {filteredProducts.length} Items
                </span>
                {(activeCategoryId || activeShopId) && (
                    <span className="text-xs text-gray-400">
                        {activeCategoryId ? 'in category selection' : 'showing available stock'}
                    </span>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                 <button className="flex items-center gap-1 text-xs font-medium border rounded px-3 py-1.5 hover:bg-gray-50 transition-colors">
                    Sort by: Best Match <ChevronDown size={14} />
                 </button>
                 <button className="md:hidden p-2 text-gray-500" onClick={() => setSidebarOpen(true)}>
                    <Filter size={18} />
                 </button>
            </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0 pb-10">
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
            />
          ))}
          
          {filteredProducts.length === 0 && (
             <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-gray-400">
                <ShoppingBag size={48} className="mb-4 opacity-20" />
                <p>No products found matching your selection.</p>
                {(activeCategoryId || activeShopId) && (
                    <button 
                        onClick={() => { setActiveCategoryId(null); setActiveShopId(null); }}
                        className="mt-4 text-brand-blue hover:underline text-sm font-medium"
                    >
                        Clear all filters
                    </button>
                )}
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StoreFront;