import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart, Store, ArrowRight } from 'lucide-react';
import { cart, useCart } from '../cart';

const CartPage: React.FC = () => {
  const items = useCart();
  const navigate = useNavigate();
  const groups = cart.groupBySeller();
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const currency = items[0]?.currency || 'LKR';

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Browse components and add them to your cart.</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-brand-blue text-white px-6 py-2.5 rounded-md font-semibold hover:bg-blue-600">
          Browse products <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(groups).map(([slug, group]) => (
            <div key={slug} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 flex items-center gap-2 text-sm font-medium text-gray-700 border-b">
                <Store size={14} className="text-brand-blue" /> {group.shop_name}
              </div>
              {group.items.map(it => (
                <div key={it.catalog_item_id} className="flex items-center gap-3 p-4 border-b last:border-b-0">
                  <img src={it.image || ''} alt="" className="w-14 h-14 object-cover rounded bg-gray-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${it.catalog_item_id}`} className="text-sm font-medium text-gray-800 hover:text-brand-blue line-clamp-2">{it.name}</Link>
                    <p className="text-xs text-gray-500">{it.currency} {it.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => cart.setQty(it.catalog_item_id, it.shop_slug, it.qty - 1)} className="p-1 border rounded hover:bg-gray-50"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm">{it.qty}</span>
                    <button onClick={() => cart.setQty(it.catalog_item_id, it.shop_slug, it.qty + 1)} className="p-1 border rounded hover:bg-gray-50"><Plus size={14} /></button>
                  </div>
                  <div className="w-24 text-right text-sm font-semibold text-gray-900">{it.currency} {(it.price * it.qty).toFixed(2)}</div>
                  <button onClick={() => cart.remove(it.catalog_item_id, it.shop_slug)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-24">
            <h3 className="font-semibold text-gray-800 mb-4">Order Summary</h3>
            <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">Items</span><span>{items.reduce((s, i) => s + i.qty, 0)}</span></div>
            <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">Sellers</span><span>{Object.keys(groups).length}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-3 mt-3"><span>Total</span><span>{currency} {total.toFixed(2)}</span></div>
            <p className="text-xs text-gray-400 mt-2">You'll pay each seller separately via their LANKAQR.</p>
            <button onClick={() => navigate('/checkout')} className="w-full mt-4 bg-brand-blue text-white py-2.5 rounded-md font-semibold hover:bg-blue-600 flex items-center justify-center gap-2">
              Checkout <ArrowRight size={16} />
            </button>
            <button onClick={() => cart.clear()} className="w-full mt-2 text-xs text-gray-400 hover:text-red-500">Clear cart</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
