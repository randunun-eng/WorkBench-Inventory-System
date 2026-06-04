import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, CheckCircle, Loader, ArrowRight, QrCode } from 'lucide-react';
import { cart, useCart } from '../cart';
import { api } from '../api';

interface PlacedOrder {
  order_id: string;
  shop_slug: string;
  shop_name: string;
  subtotal: number;
  currency: string;
  payment?: any;       // seller's payment info (QR + bank)
  reference: string;   // buyer-entered bank reference
  submitted: boolean;
  error?: string;
}

const Checkout: React.FC = () => {
  const items = useCart();
  const [buyer, setBuyer] = useState({ name: '', phone: '', email: '', address: '' });
  const [step, setStep] = useState<'details' | 'pay'>('details');
  const [placing, setPlacing] = useState(false);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [topError, setTopError] = useState('');

  const groups = cart.groupBySeller();
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const currency = items[0]?.currency || 'LKR';

  const placeOrders = async () => {
    if (!buyer.name.trim() || !buyer.phone.trim()) {
      setTopError('Please enter your name and phone number.');
      return;
    }
    setPlacing(true); setTopError('');
    try {
      const placed: PlacedOrder[] = [];
      for (const [slug, group] of Object.entries(groups)) {
        const res = await api.createOrder({
          shop_slug: slug,
          buyer,
          items: group.items.map(i => ({ catalog_item_id: i.catalog_item_id, qty: i.qty })),
        });
        const payment = await api.getShopPayment(slug);
        placed.push({
          order_id: res.order_id, shop_slug: slug, shop_name: group.shop_name,
          subtotal: res.subtotal, currency: res.currency, payment, reference: '', submitted: false,
        });
      }
      setOrders(placed);
      cart.clear();           // orders now exist server-side
      setStep('pay');
    } catch (e: any) {
      setTopError(e.message || 'Could not place the order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const submitPayment = async (idx: number) => {
    const o = orders[idx];
    if (!o.reference.trim() || o.reference.trim().length < 3) {
      updateOrder(idx, { error: 'Enter the bank reference from your payment.' });
      return;
    }
    try {
      await api.submitOrderPayment(o.order_id, o.reference.trim());
      updateOrder(idx, { submitted: true, error: undefined });
    } catch (e: any) {
      updateOrder(idx, { error: e.message || 'Failed to submit.' });
    }
  };

  const updateOrder = (idx: number, patch: Partial<PlacedOrder>) =>
    setOrders(prev => prev.map((o, i) => i === idx ? { ...o, ...patch } : o));

  // ---- Step 2: payment ----
  if (step === 'pay') {
    const allDone = orders.every(o => o.submitted);
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pay each seller</h1>
        <p className="text-gray-500 mb-6">Scan each seller's LANKAQR, pay the amount, then enter the bank reference so they can confirm and dispatch your order.</p>

        {allDone && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="text-green-600 shrink-0" size={20} />
            <div className="text-sm text-green-800">
              <p className="font-semibold">All payments submitted!</p>
              <p>Each seller will verify your payment and dispatch your order. You can track each order below.</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {orders.map((o, idx) => (
            <div key={o.order_id} className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-semibold text-gray-800"><Store size={16} className="text-brand-blue" /> {o.shop_name}</div>
                <div className="text-lg font-bold">{o.currency} {Number(o.subtotal).toFixed(2)}</div>
              </div>

              {o.submitted ? (
                <div className="bg-green-50 text-green-800 text-sm rounded-md p-3 flex items-center justify-between">
                  <span className="flex items-center gap-2"><CheckCircle size={16} /> Payment submitted — awaiting confirmation.</span>
                  <Link to={`/order/${o.order_id}`} className="underline font-medium">Track order</Link>
                </div>
              ) : o.payment?.accepts_payments === false || (!o.payment?.qr_url && !o.payment?.account_number) ? (
                <div className="text-sm text-amber-700 bg-amber-50 rounded-md p-3">
                  This seller hasn't finished setting up payments. Please contact them
                  {o.payment?.contact_phone ? ` on ${o.payment.contact_phone}` : ''} to arrange payment.
                  <div className="mt-2"><Link to={`/order/${o.order_id}`} className="underline">View order</Link></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="text-center">
                    {o.payment?.qr_url ? (
                      <img src={api.getImageUrl(o.payment.qr_url.replace('/api/images/', ''))} alt="LANKAQR" className="w-44 h-44 object-contain border rounded-md mx-auto bg-white" />
                    ) : (
                      <div className="w-44 h-44 border-2 border-dashed rounded-md mx-auto flex items-center justify-center text-gray-400"><QrCode size={28} /></div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">Scan with your bank app</p>
                  </div>
                  <div className="text-sm">
                    {o.payment?.account_name && <p><span className="text-gray-500">Account:</span> {o.payment.account_name}</p>}
                    {o.payment?.bank_name && <p><span className="text-gray-500">Bank:</span> {o.payment.bank_name} {o.payment.bank_branch ? `(${o.payment.bank_branch})` : ''}</p>}
                    {o.payment?.account_number && <p><span className="text-gray-500">Acc No:</span> {o.payment.account_number}</p>}
                    {o.payment?.payment_instructions && <p className="text-xs text-gray-500 mt-2 italic">{o.payment.payment_instructions}</p>}
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Bank reference after paying</label>
                      <input value={o.reference} onChange={e => updateOrder(idx, { reference: e.target.value })}
                        placeholder="e.g. TXN12345678"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue outline-none" />
                      {o.error && <p className="text-xs text-red-600 mt-1">{o.error}</p>}
                      <button onClick={() => submitPayment(idx)} className="w-full mt-2 bg-brand-blue text-white py-2 rounded-md text-sm font-semibold hover:bg-blue-600">I've paid — submit reference</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-brand-blue hover:underline">Continue shopping</Link>
        </div>
      </div>
    );
  }

  // ---- Step 1: details ----
  if (items.length === 0) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-500">Your cart is empty. <Link to="/" className="text-brand-blue underline">Browse products</Link></div>;
  }

  const inp = (label: string, key: keyof typeof buyer, opts: { type?: string; required?: boolean } = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{opts.required && <span className="text-red-500"> *</span>}</label>
      <input type={opts.type || 'text'} value={buyer[key]} onChange={e => setBuyer({ ...buyer, [key]: e.target.value })}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue outline-none" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Your details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inp('Full Name', 'name', { required: true })}
            {inp('Phone', 'phone', { required: true })}
            {inp('Email', 'email', { type: 'email' })}
            {inp('Delivery Address', 'address')}
          </div>
          {topError && <p className="text-sm text-red-600 mt-4">{topError}</p>}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-24">
            <h3 className="font-semibold text-gray-800 mb-4">Order Summary</h3>
            {Object.entries(groups).map(([slug, g]) => (
              <div key={slug} className="mb-3 text-sm">
                <p className="font-medium text-gray-700 flex items-center gap-1"><Store size={12} className="text-brand-blue" /> {g.shop_name}</p>
                {g.items.map(i => <div key={i.catalog_item_id} className="flex justify-between text-gray-500 text-xs pl-4"><span className="truncate max-w-[60%]">{i.qty}× {i.name}</span><span>{i.currency} {(i.price * i.qty).toFixed(2)}</span></div>)}
              </div>
            ))}
            <div className="flex justify-between font-bold text-lg border-t pt-3 mt-3"><span>Total</span><span>{currency} {total.toFixed(2)}</span></div>
            <button onClick={placeOrders} disabled={placing} className="w-full mt-4 bg-brand-blue text-white py-2.5 rounded-md font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {placing ? <><Loader size={16} className="animate-spin" /> Placing…</> : <>Place order <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
