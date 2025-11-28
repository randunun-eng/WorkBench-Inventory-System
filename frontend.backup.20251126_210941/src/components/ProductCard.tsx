import type { Product } from '../api/client';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

const ProductCard = ({ product, onClick }: ProductCardProps) => {
  const discount = Math.floor(Math.random() * 30) + 10; // Random discount for demo
  const originalPrice = product.price * (1 + discount / 100);
  const hasFreeShipping = product.price > 10;
  const soldCount = Math.floor(Math.random() * 500) + 10;

  // Generate a consistent placeholder image based on product ID
  const getPlaceholderImage = () => {
    if (product.image_url) return product.image_url;

    const seed = product.id || Math.random().toString();
    const imageId = Math.abs(seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 1000;

    return `https://picsum.photos/seed/${product.id || imageId}/400/400`;
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group relative transform hover:-translate-y-1"
    >
      {/* Product Image */}
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
        <img
          src={getPlaceholderImage()}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          loading="lazy"
        />

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            -{discount}%
          </div>
        )}

        {/* Stock Badge */}
        {product.stock_quantity < 10 && product.stock_quantity > 0 && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
            Only {product.stock_quantity} left
          </div>
        )}

        {product.stock_quantity === 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        <h3
          className="text-sm leading-tight text-gray-700 line-clamp-2 mb-2 group-hover:text-orange-600 min-h-[2.5rem]"
          title={product.name}
        >
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-lg font-bold text-red-600">${product.price.toFixed(2)}</span>
          {discount > 0 && (
            <span className="text-xs text-gray-400 line-through">${originalPrice.toFixed(2)}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasFreeShipping && (
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded">
              Free Ship
            </span>
          )}
          <span className="text-xs text-gray-500">{soldCount}+ sold</span>
        </div>

        {product.stock_quantity > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button className="w-full bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 transition-colors text-sm">
              Add to Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
