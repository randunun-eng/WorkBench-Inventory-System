import { Hono } from 'hono'
import { authMiddleware } from '../auth'

// Seller payment settings — each shop's own LANKAQR / bank details so buyers
// pay the seller directly (marketplace). Public per-shop display lives in
// shop.ts at GET /api/shop/:slug/payment.
const payments = new Hono<{ Bindings: any, Variables: { user: any } }>()

const FIELDS = [
    'business_name', 'business_reg_no', 'account_name', 'bank_name', 'bank_branch',
    'account_number', 'lankaqr_merchant_id', 'lankaqr_qr_r2_key',
    'contact_phone', 'contact_email', 'payment_instructions',
] as const

// GET /api/payments/details — the logged-in shop's own payment details
payments.get('/details', authMiddleware, async (c) => {
    const user = c.get('user')
    const row = await c.env.DB.prepare(
        'SELECT * FROM shop_payment_details WHERE shop_id = ?'
    ).bind(user.uid).first()

    // Return an empty shell (not 404) so the form renders cleanly for new shops.
    if (!row) {
        return c.json({ shop_id: user.uid, accepts_payments: 0 })
    }
    return c.json(row)
})

// PUT /api/payments/details — upsert the shop's payment details
payments.put('/details', authMiddleware, async (c) => {
    const user = c.get('user')
    const body = await c.req.json()

    // Whitelist incoming fields
    const vals: Record<string, any> = {}
    for (const f of FIELDS) vals[f] = body[f] ?? null

    // accepts_payments: explicit boolean, but only meaningful if there's a way
    // to be paid (a QR or bank account). Coerce safely.
    const hasPayMethod = !!(vals.lankaqr_qr_r2_key || (vals.bank_name && vals.account_number))
    const accepts = body.accepts_payments && hasPayMethod ? 1 : 0

    try {
        await c.env.DB.prepare(`
            INSERT INTO shop_payment_details (
                shop_id, business_name, business_reg_no, account_name, bank_name, bank_branch,
                account_number, lankaqr_merchant_id, lankaqr_qr_r2_key, contact_phone,
                contact_email, payment_instructions, accepts_payments, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(shop_id) DO UPDATE SET
                business_name = excluded.business_name,
                business_reg_no = excluded.business_reg_no,
                account_name = excluded.account_name,
                bank_name = excluded.bank_name,
                bank_branch = excluded.bank_branch,
                account_number = excluded.account_number,
                lankaqr_merchant_id = excluded.lankaqr_merchant_id,
                lankaqr_qr_r2_key = excluded.lankaqr_qr_r2_key,
                contact_phone = excluded.contact_phone,
                contact_email = excluded.contact_email,
                payment_instructions = excluded.payment_instructions,
                accepts_payments = excluded.accepts_payments,
                updated_at = CURRENT_TIMESTAMP
        `).bind(
            user.uid, vals.business_name, vals.business_reg_no, vals.account_name,
            vals.bank_name, vals.bank_branch, vals.account_number, vals.lankaqr_merchant_id,
            vals.lankaqr_qr_r2_key, vals.contact_phone, vals.contact_email,
            vals.payment_instructions, accepts
        ).run()

        return c.json({ ok: true, accepts_payments: accepts, has_pay_method: hasPayMethod })
    } catch (e: any) {
        return c.json({ error: 'Failed to save payment details', details: e.message }, 500)
    }
})

export default payments
