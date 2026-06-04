import React, { useState, useEffect } from 'react';
import { Wallet, Upload, Save, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import { api } from '../api';

// Seller payment settings — each shop enters its own LANKAQR / bank details and
// uploads its unique merchant QR so buyers pay this seller directly at checkout.
const PaymentSettings: React.FC = () => {
  const [form, setForm] = useState<any>({
    business_name: '', business_reg_no: '', account_name: '', bank_name: '',
    bank_branch: '', account_number: '', lankaqr_merchant_id: '',
    lankaqr_qr_r2_key: '', contact_phone: '', contact_email: '',
    payment_instructions: '', accepts_payments: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPaymentDetails()
      .then((d) => { if (d) setForm((f: any) => ({ ...f, ...d, accepts_payments: !!d.accepts_payments })); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const { key } = await api.uploadImage(file, false);
      set('lankaqr_qr_r2_key', key);
    } catch {
      setError('QR upload failed. Please try a PNG or JPG image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await api.savePaymentDetails(form);
      set('accepts_payments', !!res.accepts_payments);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading payment settings…</div>;

  const hasPayMethod = !!(form.lankaqr_qr_r2_key || (form.bank_name && form.account_number));

  const field = (label: string, key: string, opts: { placeholder?: string; type?: string; help?: string } = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={opts.type || 'text'}
        value={form[key] || ''}
        onChange={(e) => set(key, e.target.value)}
        placeholder={opts.placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none"
      />
      {opts.help && <p className="text-xs text-gray-400 mt-1">{opts.help}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl">
      {/* Readiness banner */}
      <div className={`mb-6 rounded-lg p-4 flex items-start gap-3 ${form.accepts_payments ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        {form.accepts_payments
          ? <CheckCircle className="text-green-600 shrink-0" size={20} />
          : <AlertCircle className="text-amber-600 shrink-0" size={20} />}
        <div className="text-sm">
          <p className={`font-semibold ${form.accepts_payments ? 'text-green-800' : 'text-amber-800'}`}>
            {form.accepts_payments ? 'You can receive payments' : 'Payments not active yet'}
          </p>
          <p className={form.accepts_payments ? 'text-green-700' : 'text-amber-700'}>
            {form.accepts_payments
              ? 'Buyers can check out items from your shop and pay you directly.'
              : 'Upload your LANKAQR (or add bank details) and tick "Accept payments" so buyers can order from you.'}
          </p>
        </div>
      </div>

      {/* LANKAQR */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-1"><QrCode size={18} /> Your LANKAQR Code</h3>
        <p className="text-sm text-gray-500 mb-4">Upload the static LANKAQR image issued by your bank. Buyers scan this to pay you.</p>
        <div className="flex items-center gap-6">
          {form.lankaqr_qr_r2_key ? (
            <img src={api.getImageUrl(form.lankaqr_qr_r2_key)} alt="LANKAQR" className="w-36 h-36 object-contain border rounded-md bg-white" />
          ) : (
            <div className="w-36 h-36 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400 text-xs text-center px-2">No QR uploaded</div>
          )}
          <label className="inline-flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium">
            <Upload size={16} /> {uploading ? 'Uploading…' : (form.lankaqr_qr_r2_key ? 'Replace QR' : 'Upload QR')}
            <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={uploading} />
          </label>
        </div>
        <div className="mt-4">
          {field('LANKAQR Merchant ID (MID)', 'lankaqr_merchant_id', { placeholder: 'e.g. 0001234567', help: 'Optional — the MID your bank/LankaPay assigned.' })}
        </div>
      </section>

      {/* Bank account */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-4"><Wallet size={18} /> Bank Account</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Account Holder Name', 'account_name', { placeholder: 'As per bank records' })}
          {field('Account Number', 'account_number', { placeholder: 'e.g. 100200300400' })}
          {field('Bank', 'bank_name', { placeholder: 'e.g. Commercial Bank' })}
          {field('Branch', 'bank_branch', { placeholder: 'e.g. Colombo 03' })}
        </div>
      </section>

      {/* Business / contact */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Business & Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Business Name', 'business_name', { placeholder: 'Registered business name' })}
          {field('Business Reg. No (BR)', 'business_reg_no', { placeholder: 'e.g. PV 1234567' })}
          {field('Contact Phone', 'contact_phone', { placeholder: '07X XXX XXXX' })}
          {field('Contact Email', 'contact_email', { type: 'email', placeholder: 'shop@example.com' })}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Instructions (shown to buyers)</label>
          <textarea
            value={form.payment_instructions || ''}
            onChange={(e) => set('payment_instructions', e.target.value)}
            rows={3}
            placeholder="e.g. After paying, send the receipt to 07X XXX XXXX on WhatsApp."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue outline-none"
          />
        </div>
      </section>

      {/* Accept toggle + save */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-between gap-4 flex-wrap">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.accepts_payments}
            onChange={(e) => set('accepts_payments', e.target.checked)}
            disabled={!hasPayMethod}
            className="w-5 h-5"
          />
          <span className="text-sm">
            <span className="font-medium text-gray-800">Accept payments from buyers</span>
            {!hasPayMethod && <span className="block text-xs text-amber-600">Add a QR or bank account first.</span>}
          </span>
        </label>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={16} /> Saved</span>}
          {error && <span className="text-red-600 text-sm">{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 bg-brand-blue text-white px-5 py-2 rounded-md font-semibold hover:bg-blue-600 disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Saving…' : 'Save Payment Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;
