import React, { useEffect, useState } from 'react';
import { Store, Phone, CheckCircle, XCircle, Package, Clock, RefreshCw } from 'lucide-react';
import { api } from '../api';

const STATUS_BADGE: Record<string, string> = {
  pending_payment: 'bg-gray-100 text-gray-600',
  payment_submitted: 'bg-amber-100 text-amber-800',
  paid: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  payment_submitted: 'Payment submitted',
  paid: 'Paid',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

const OrdersManagement: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');

  const load = () => {
    setLoading(true);
    api.getShopOrders().then(setOrders).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const act = async (id: string, action: 'confirm' | 'reject' | 'fulfill') => {
    setBusy(id + action);
    try { await api.orderAction(id, action); load(); }
    catch (e: any) { alert(e.message || 'Action failed'); }
    finally { setBusy(''); }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading orders…</div>;

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <Package size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600">No orders yet.</p>
        <p className="text-sm text-gray-400">Orders from buyers will appear here. Make sure your Payments are set up so buyers can check out.</p>
      </div>
    );
  }

  const pendingCount = orders.filter(o => o.status === 'payment_submitted').length;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{pendingCount > 0 ? `${pendingCount} order(s) need your confirmation` : 'All caught up'}</p>
        <button onClick={load} className="text-sm text-gray-500 hover:text-brand-blue flex items-center gap-1"><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="space-y-4">
        {orders.map(o => (
          <div key={o.id} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-gray-800">Order #{String(o.id).slice(0, 8)}</p>
                <p className="text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                  <span>{o.buyer_name}</span>
                  {o.buyer_phone && <span className="flex items-center gap-1"><Phone size={12} /> {o.buyer_phone}</span>}
                </p>
                {o.buyer_address && <p className="text-xs text-gray-400">{o.buyer_address}</p>}
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[o.status] || 'bg-gray-100'}`}>
                {STATUS_LABEL[o.status] || o.status}
              </span>
            </div>

            <div className="mt-3 border-t pt-3 divide-y">
              {(o.items || []).map((it: any, i: number) => (
                <div key={i} className="flex justify-between py-1.5 text-sm">
                  <span className="text-gray-600">{it.qty}× {it.name}</span>
                  <span className="font-medium">{o.currency} {Number(it.line_total).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="text-sm">
                <span className="font-bold">{o.currency} {Number(o.subtotal).toFixed(2)}</span>
                {o.payment_reference && <span className="text-xs text-gray-500 ml-3">Ref: <span className="font-mono">{o.payment_reference}</span></span>}
              </div>
              <div className="flex gap-2">
                {o.status === 'payment_submitted' && (
                  <>
                    <button disabled={!!busy} onClick={() => act(o.id, 'confirm')} className="inline-flex items-center gap-1 bg-green-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle size={14} /> Confirm payment
                    </button>
                    <button disabled={!!busy} onClick={() => act(o.id, 'reject')} className="inline-flex items-center gap-1 border border-gray-300 text-gray-600 text-sm px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50">
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
                {o.status === 'paid' && (
                  <button disabled={!!busy} onClick={() => act(o.id, 'fulfill')} className="inline-flex items-center gap-1 bg-brand-blue text-white text-sm px-3 py-1.5 rounded-md hover:bg-blue-600 disabled:opacity-50">
                    <Package size={14} /> Mark fulfilled
                  </button>
                )}
                {o.status === 'pending_payment' && (
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> waiting for buyer</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersManagement;
