import React, { useState } from 'react';
import { Product } from '../types';
import { MapPin, Store, Package, ShoppingCart, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cart } from '../cart';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [added, setAdded] = useState(false);

  const canBuy = product.price !== null && product.stockQty > 0 && !!product.shopId;

  const handleAdd = () => {
    if (!canBuy) return;
    cart.add({
      catalog_item_id: product.id,
      name: product.name,
      price: product.price as number,
      currency: product.currency,
      shop_slug: product.shopId,
      shop_name: product.shopName || product.shopId,
      image: product.image,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 overflow-hidden flex flex-col h-full group">
      {/* Image Container */}
      <Link to={`/product/${product.id}`} className="relative aspect-square overflow-hidden bg-gray-50">
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
            <div className="flex items-center gap-1 text-gray-900 font-medium truncate">
              <Store size={12} className="text-brand-blue" />
              <span>{product.shopName || (product.shopId ? product.shopId.replace(/-/g, ' ') : 'Unknown Shop')}</span>
            </div>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAdd}
            disabled={!canBuy}
            className={`mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-md transition-colors ${
              added ? 'bg-emerald-500 text-white'
                : canBuy ? 'bg-brand-blue text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {added ? <><Check size={14} /> Added</>
              : canBuy ? <><ShoppingCart size={14} /> Add to Cart</>
              : (product.price === null ? 'Call for Price' : 'Out of Stock')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;