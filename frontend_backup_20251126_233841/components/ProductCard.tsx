import React from 'react';
import { Product } from '../types';
import { MapPin, Store } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const handleClick = () => {
    // Store product in localStorage for ProductDetail page
    localStorage.setItem(`product_${product.id}`, JSON.stringify(product));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 overflow-hidden flex flex-col h-full group">
      {/* Image Container */}
      <Link to={`/product/${product.id}`} onClick={handleClick} className="relative aspect-square overflow-hidden bg-gray-50">
        <img 
          src={product.image} 
          alt={product.name} 
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {product.isHot && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            HOT
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <Link to={`/product/${product.id}`} className="block">
            <h3 className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-brand-blue mb-1 min-h-[40px] transition-colors">
            {product.name}
            </h3>
        </Link>
        
        {/* Specs Micro-view */}
        <div className="text-xs text-gray-500 mb-3 space-y-0.5">
          {product.specs.slice(0, 2).map((spec, idx) => (
            <div key={idx} className="flex justify-between">
              <span className="truncate max-w-[60%]">{spec.label}:</span>
              <span className="font-medium text-gray-700">{spec.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-2 border-t border-gray-50">
          {/* Price & Stock */}
          <div className="flex justify-between items-baseline mb-2">
            <div>
                 {product.price !== null ? (
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-medium text-gray-500">{product.currency}</span>
                        <span className="text-lg font-bold text-brand-dark">{product.price.toFixed(2)}</span>
                    </div>
                ) : (
                    <span className="text-xs font-semibold text-brand-blue">
                        Call for Price
                    </span>
                )}
            </div>
            <div className={`text-[10px] font-medium ${product.stockQty > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {product.stockQty > 0 ? `${product.stockQty} In Stock` : 'Out of stock'}
            </div>
          </div>

          {/* Location Info - Dynamic Shop */}
          <div className="bg-slate-50 rounded p-2 text-xs space-y-1 border border-slate-100">
             {product.shopId ? (
               <>
                 <div className="flex items-center gap-1 text-gray-900 font-medium truncate">
                    <Store size={12} className="text-brand-blue"/>
                    {(product as any).shopName || product.shopId}
                 </div>
                 <div className="flex items-center gap-1 text-gray-500 truncate">
                    <MapPin size={12} />
                    Available at shop
                 </div>
               </>
             ) : (
               <div className="text-gray-400">Shop details unavailable</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;