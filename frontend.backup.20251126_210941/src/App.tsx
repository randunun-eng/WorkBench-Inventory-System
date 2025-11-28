import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Chat from './components/Chat';
import HeroBanner from './components/HeroBanner';
import PromoBanners from './components/PromoBanners';
import CategoryBanner from './components/CategoryBanner';
import ProductCard from './components/ProductCard';
import { api } from './api/client';
import type { Product, Category } from './api/client';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'popular'>('popular');

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await api.getProducts({
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
          limit: 50,
        });
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback to demo products if API fails
        setProducts(generateDemoProducts());
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, selectedCategory]);

  // Sort products
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'popular':
      default:
        return 0;
    }
  });

  // Flash deal products (first 4 products with lowest prices)
  const flashDeals = [...products].sort((a, b) => a.price - b.price).slice(0, 4);

  return (
    <Layout onSearch={setSearchQuery}>
      <div className="flex gap-6">
        {/* Sidebar Categories */}
        <div className="w-60 shrink-0 hidden md:block">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
              Categories
            </h2>
            <ul className="space-y-1 text-sm text-gray-600">
              <li
                onClick={() => setSelectedCategory('')}
                className={`hover:text-orange-600 hover:bg-orange-50 p-2 rounded cursor-pointer flex items-center justify-between group ${
                  !selectedCategory ? 'bg-orange-50 text-orange-600 font-semibold' : ''
                }`}
              >
                <span>All Products</span>
                <svg
                  className="w-4 h-4 text-gray-400 group-hover:text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </li>
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`hover:text-orange-600 hover:bg-orange-50 p-2 rounded cursor-pointer flex items-center justify-between group ${
                    selectedCategory === cat.id ? 'bg-orange-50 text-orange-600 font-semibold' : ''
                  }`}
                >
                  <span>{cat.name}</span>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </li>
              ))}
            </ul>
          </div>

          {/* Chat Widget */}
          <div className="mt-6">
            <Chat roomId="demo-room" userId="user-1" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Hero Banner */}
          <HeroBanner />

          {/* Promotional Banners */}
          <PromoBanners />

          {/* Category Banners */}
          <CategoryBanner onCategorySelect={(cat) => setSearchQuery(cat)} />

          {/* Flash Deals Section */}
          {flashDeals.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">SUPER DEALS</span>
                  <span className="text-red-600">Flash Sale</span>
                </h2>
                <span className="text-sm text-gray-500">
                  Ends in:{' '}
                  <span className="font-mono font-bold text-gray-900">02:14:55</span>
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {flashDeals.map((product, idx) => {
                  const getFlashDealImage = () => {
                    if (product.image_url) return product.image_url;
                    return `https://picsum.photos/seed/flash${product.id || idx}/400/400`;
                  };

                  return (
                    <div
                      key={product.id}
                      className="cursor-pointer group border border-transparent hover:border-orange-200 rounded-lg p-2 hover:shadow-md transition-all"
                    >
                      <div className="aspect-square bg-gray-100 rounded-md mb-2 relative overflow-hidden">
                        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
                          -40%
                        </div>
                        <img
                          src={getFlashDealImage()}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          loading="lazy"
                        />
                      </div>
                      <div className="font-bold text-red-600 text-lg leading-tight">
                        ${product.price.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400 line-through">
                        ${(product.price * 1.4).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-1 mt-1">{product.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Products Section Header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedCategory ? categories.find((c) => c.id === selectedCategory)?.name : 'All Products'}
            </h1>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="popular">Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading products...</p>
              </div>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <svg
                className="w-24 h-24 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Demo products for fallback
function generateDemoProducts(): Product[] {
  const products = [
    'IGBT Module 600V 40A High Power',
    'Solar Panel 300W Monocrystalline',
    'Circuit Breaker 63A 3-Phase',
    'LED Driver 50W Constant Current',
    'Relay Module 12V 8-Channel',
    'Multimeter Digital Professional',
    'Cable Crimping Tool Set',
    'Terminal Block Connector 100A',
    'Contactor 3-Phase 65A',
    'Temperature Controller PID',
    'Motor Starter Soft Start 15HP',
    'Frequency Inverter VFD 2.2KW',
    'Capacitor Bank 50KVAR',
    'Transformer Toroidal 500VA',
    'Enclosure IP65 Waterproof',
    'DIN Rail Mounted Timer',
    'Proximity Sensor Inductive',
    'Photoelectric Sensor Through-beam',
  ];

  return products.map((name, i) => ({
    id: `demo-${i}`,
    name: name,
    description: `High quality ${name.toLowerCase()} for industrial use`,
    price: Math.floor(Math.random() * 100) + 10,
    stock_quantity: Math.floor(Math.random() * 100),
    sku: `SKU${String(i).padStart(5, '0')}`,
  }));
}

export default App;
