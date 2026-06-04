import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, Package, Store } from 'lucide-react';
import { api } from '../api';

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  pending_payment: { label: 'Awaiting Payment', cls: 'bg-amber-50 text-amber-800 border-amber-200', icon: Clock },
  payment_submitted: { label: 'Payment Submitted — Awaiting Seller Confirmation', cls: 'bg-blue-50 text-blue-800 border-blue-200', icon: Clock },
  paid: { label: 'Paid — Being Prepared', cls: 'bg-green-50 text-green-800 border-green-200', icon: CheckCircle },
  fulfilled: { label: 'Fulfilled', cls: 'bg-green-50 text-green-800 border-green-200', icon: Package },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

const OrderConfirmation: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) api.getOrder(id).then(setOrder).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-500">Loading order…</div>;
  if (!order) return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-500">Order not found. <Link to="/" className="text-brand-blue underline">Home</Link></div>;

  const st = STATUS[order.status] || STATUS.pending_payment;
  const Icon = st.icon;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order #{String(order.id).slice(0, 8)}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1"><Store size={14} className="text-brand-blue" /> {order.shop_name}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${st.cls}`}>
            <Icon size={14} /> {st.label}
          </div>
        </div>

        <div className="border-t border-b divide-y">
          {(order.items || []).map((it: any, i: number) => (
            <div key={i} className="flex justify-between py-3 text-sm">
              <span className="text-gray-700">{it.qty}× {it.name}</span>
              <span className="font-medium">{order.currency} {Number(it.line_total).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between font-bold text-lg pt-4">
          <span>Total</span>
          <span>{order.currency} {Number(order.subtotal).toFixed(2)}</span>
        </div>

        {order.payment_reference && (
          <p className="text-xs text-gray-500 mt-3">Payment reference: <span className="font-mono">{order.payment_reference}</span></p>
        )}

        <div className="mt-6 bg-slate-50 rounded-md p-4 text-sm text-gray-600">
          {order.status === 'pending_payment' && 'Please complete payment via the seller\'s LANKAQR and submit your bank reference.'}
          {order.status === 'payment_submitted' && 'The seller is verifying your payment. They\'ll dispatch your order once confirmed.'}
          {order.status === 'paid' && 'Payment confirmed! The seller is preparing your order.'}
          {order.status === 'fulfilled' && 'This order has been fulfilled. Thank you!'}
          {order.status === 'cancelled' && 'This order was cancelled.'}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-brand-blue hover:underline">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
