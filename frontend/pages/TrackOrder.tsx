import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, Store, ArrowRight } from 'lucide-react';
import { api } from '../api';

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting Payment',
  payment_submitted: 'Payment Submitted',
  paid: 'Paid',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};
const STATUS_CLS: Record<string, string> = {
  pending_payment: 'bg-gray-100 text-gray-600',
  payment_submitted: 'bg-amber-100 text-amber-800',
  paid: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};

const TrackOrder: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim().length < 4) return;
    setLoading(true);
    const res = await api.lookupOrders(phone.trim());
    setOrders(res);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Track your orders</h1>
      <p className="text-gray-500 mb-6">Enter the phone number you used at checkout to see your orders.</p>

      <form onSubmit={search} className="flex gap-2 mb-8">
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="e.g. 0771234567"
          className="flex-1 border border-gray-300 rounded-md px-4 py-2.5 focus:ring-2 focus:ring-brand-blue outline-none"
        />
        <button type="submit" className="bg-brand-blue text-white px-5 rounded-md font-semibold hover:bg-blue-600 flex items-center gap-2">
          <Search size={16} /> Find
        </button>
      </form>

      {loading && <p className="text-gray-500">Searching…</p>}

      {orders !== null && !loading && (
        orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package size={36} className="mx-auto text-gray-300 mb-3" />
            No orders found for that number.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <Link key={o.id} to={`/order/${o.id}`} className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-brand-blue transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">Order #{String(o.id).slice(0, 8)}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1"><Store size={12} className="text-brand-blue" /> {o.shop_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLS[o.status] || 'bg-gray-100'}`}>{STATUS_LABEL[o.status] || o.status}</span>
                    <p className="text-sm font-bold mt-1">{o.currency} {Number(o.subtotal).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end text-xs text-brand-blue mt-2">View details <ArrowRight size={12} /></div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default TrackOrder;
