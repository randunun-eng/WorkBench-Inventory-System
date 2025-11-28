import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_PRODUCTS, MOCK_SHOPS } from '../mockData';
import { ArrowLeft, Check, ShieldCheck, MapPin, Store, MessageCircle, Phone, Navigation, Clock } from 'lucide-react';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const product = MOCK_PRODUCTS.find(p => p.id === id);
  const shop = product ? MOCK_SHOPS.find(s => s.id === product.shopId) : null;

  if (!product || !shop) {
    return (
        <div className="max-w-7xl mx-auto p-10 text-center">
            <h2 className="text-xl font-bold">Product or Shop not found</h2>
            <Link to="/" className="text-brand-blue mt-4 block">Return Home</Link>
        </div>
    );
  }

  // Format price as LKR
  const formattedPrice = product.price 
    ? new Intl.NumberFormat('en-LK', { style: 'currency', currency: product.currency }).format(product.price)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-brand-blue mb-4 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Search
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
            
            {/* Gallery Section */}
            <div className="p-4 md:p-8 bg-gray-50 flex items-center justify-center">
                <div className="relative aspect-square w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Info Section */}
            <div className="p-6 md:p-8 flex flex-col">
                <div className="mb-4">
                    <span className="text-xs font-bold text-brand-blue bg-blue-50 px-2 py-1 rounded">
                        Original Part
                    </span>
                    <h1 className="text-2xl font-bold text-brand-dark mt-2 leading-tight">
                        {product.name}
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                         <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                             <Clock size={12} />
                             Last updated: Today
                         </div>
                        <span className="text-gray-300">|</span>
                        <span className={`text-sm font-medium ${product.stockQty > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {product.stockQty} Units Available
                        </span>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100">
                    <div className="flex items-baseline gap-2 mb-2">
                        {formattedPrice ? (
                            <>
                                <span className="text-3xl font-bold text-gray-900">{formattedPrice}</span>
                                <span className="text-sm text-gray-500">/ piece</span>
                            </>
                        ) : (
                            <span className="text-2xl font-bold text-brand-blue">Contact for Price</span>
                        )}
                    </div>
                    {product.minOrderQty > 1 && (
                        <div className="text-xs text-blue-600 font-medium">
                            Minimum Order: {product.minOrderQty} pieces
                        </div>
                    )}
                </div>

                {/* Specs Table */}
                <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 mb-3">Specifications</h3>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                        {product.specs.map((spec, i) => (
                            <div key={i} className="flex flex-col pb-2 border-b border-dashed border-gray-200">
                                <span className="text-gray-500 text-xs">{spec.label}</span>
                                <span className="font-medium text-gray-800">{spec.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Where to Buy / Location Section */}
                <div className="mt-auto bg-blue-50 border border-blue-100 rounded-lg p-5">
                    <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Store size={16} />
                        Available at {shop.name}
                    </h3>
                    
                    <div className="flex flex-col gap-3">
                        <div>
                            <div className="font-bold text-gray-900 text-lg">{shop.name}</div>
                            <div className="flex items-start gap-2 text-gray-600 text-sm mt-1">
                                <MapPin size={16} className="mt-0.5 shrink-0" />
                                <span>{shop.contact.address}</span>
                            </div>
                             <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                                <Phone size={16} className="shrink-0" />
                                <span>{shop.contact.phone}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-2">
                             <button className="flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-md text-sm font-medium transition-colors">
                                <Navigation size={16} />
                                Get Directions
                             </button>
                             <button className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-600 text-white py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
                                <MessageCircle size={16} />
                                Chat with Shop
                             </button>
                        </div>
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-6 mt-6 text-[10px] text-gray-500">
                    <div className="flex items-center gap-1">
                        <ShieldCheck size={16} className={shop.verified ? "text-emerald-600" : "text-gray-400"}/>
                        <span>{shop.verified ? "Verified Seller" : "Unverified Seller"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Check size={16} className="text-blue-600"/>
                        <span>Inventory Confirmed</span>
                    </div>
                </div>

            </div>
        </div>

        {/* Description Section */}
        <div className="border-t border-gray-200 p-6 md:p-8 bg-gray-50 mt-8">
            <h3 className="font-bold text-gray-900 mb-4">Product Description</h3>
            <div className="prose prose-sm max-w-none text-gray-600">
                <p>{product.description}</p>
                <p className="mt-4">
                    Visit {shop.name} to inspect this component. Please confirm availability via chat before traveling.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;