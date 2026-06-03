import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid'
import { authMiddleware } from '../auth'
import { PLANS, TRIAL_DAYS, isProRow, isAdmin, grantPro } from '../subscription'

const subscription = new Hono<{ Bindings: any, Variables: { user: any } }>()

// -----------------------------------------------------------------------------
// GET /status — current plan for the logged-in shop
// -----------------------------------------------------------------------------
subscription.get('/status', authMiddleware, async (c) => {
    const user = c.get('user')
    const admin = isAdmin(c, user)

    const row = await c.env.DB.prepare(
        'SELECT plan, plan_status, plan_started_at, plan_expires_at FROM users WHERE id = ?'
    ).bind(user.uid).first()

    const pro = admin || isProRow(row)

    return c.json({
        plan: pro ? 'pro' : 'free',
        status: admin ? 'admin' : (row?.plan_status || 'active'),
        expires_at: row?.plan_expires_at || null,
        trial_used: !!(row?.plan_started_at),
        trial_days: TRIAL_DAYS,
        plans: PLANS,
    })
})

// -----------------------------------------------------------------------------
// POST /start-trial — self-serve 14-day Pro trial (once per shop)
// Drives the freemium funnel without needing payment setup.
// -----------------------------------------------------------------------------
subscription.post('/start-trial', authMiddleware, async (c) => {
    const user = c.get('user')

    const row = await c.env.DB.prepare(
        'SELECT plan, plan_status, plan_started_at FROM users WHERE id = ?'
    ).bind(user.uid).first()

    // plan_started_at is set the first time any trial/subscription begins,
    // so it doubles as a "already used a trial" guard.
    if (row && (row.plan === 'pro' || row.plan_status === 'trialing' || row.plan_started_at)) {
        return c.json({ error: 'Trial already used, or you are already on Pro.' }, 409)
    }

    const expires = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

    await c.env.DB.batch([
        c.env.DB.prepare(
            `UPDATE users SET plan = 'pro', plan_status = 'trialing',
             plan_started_at = CURRENT_TIMESTAMP, plan_expires_at = ? WHERE id = ?`
        ).bind(expires, user.uid),
        c.env.DB.prepare(
            `INSERT INTO subscription_events (user_id, event_type) VALUES (?, 'trial_started')`
        ).bind(user.uid),
    ])

    return c.json({ ok: true, plan: 'pro', status: 'trialing', expires_at: expires })
})

// -----------------------------------------------------------------------------
// POST /checkout — begin a PayHere subscription (requires merchant config)
// Returns the parameters the frontend posts to PayHere's checkout. Full wiring
// (MD5 hash + recurring params) is added once a PayHere merchant account exists.
// -----------------------------------------------------------------------------
subscription.post('/checkout', authMiddleware, async (c) => {
    const merchantId = c.env.PAYHERE_MERCHANT_ID
    const merchantSecret = c.env.PAYHERE_MERCHANT_SECRET

    if (!merchantId || !merchantSecret) {
        return c.json({
            error: 'billing_not_configured',
            message: 'PayHere is not set up yet. Configure PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET.',
        }, 503)
    }

    // Pending: generate order_id, compute the PayHere MD5 checkout hash, and
    // return { merchant_id, order_id, amount, currency, recurrence, ... } for
    // the frontend to POST to https://sandbox.payhere.lk/pay/checkout.
    return c.json({
        error: 'not_implemented',
        message: 'PayHere checkout wiring is pending a merchant account + MD5 hashing.',
    }, 501)
})

// -----------------------------------------------------------------------------
// POST /notify — PayHere server-to-server callback (public, no auth)
// PayHere POSTs payment status here; we verify md5sig and activate Pro.
// -----------------------------------------------------------------------------
subscription.post('/notify', async (c) => {
    if (!c.env.PAYHERE_MERCHANT_SECRET) {
        return c.json({ error: 'billing_not_configured' }, 503)
    }
    // Pending: verify md5sig, on status_code === '2' set the user to Pro and
    // store payhere_subscription_id + plan_expires_at; log to subscription_events.
    return c.text('OK')
})

// -----------------------------------------------------------------------------
// POST /grant — admin-only: manually grant/revoke Pro (comps & testing)
// body: { email, plan: 'pro' | 'free', days?: number }
// -----------------------------------------------------------------------------
subscription.post('/grant', authMiddleware, async (c) => {
    const user = c.get('user')
    if (!isAdmin(c, user)) return c.json({ error: 'Forbidden: admin only' }, 403)

    const { email, plan, days } = await c.req.json()
    if (!email || !['pro', 'free'].includes(plan)) {
        return c.json({ error: 'email and plan ("pro"|"free") required' }, 400)
    }

    const target = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (!target) return c.json({ error: 'User not found' }, 404)

    if (plan === 'pro') {
        const expires = await grantPro(c.env.DB, target.id as string, Number(days) || 30, 'manual_grant')
        return c.json({ ok: true, email, plan: 'pro', expires_at: expires })
    } else {
        await c.env.DB.prepare(
            `UPDATE users SET plan='free', plan_status='canceled', plan_expires_at=NULL WHERE id=?`
        ).bind(target.id).run()
        return c.json({ ok: true, email, plan: 'free' })
    }
})

// =============================================================================
// LANKAQR — static merchant QR + manual confirmation (zero gateway commission)
// =============================================================================

// GET /lankaqr/info — payment details for the upgrade screen
subscription.get('/lankaqr/info', authMiddleware, async (c) => {
    const qrUrl = c.env.LANKAQR_QR_URL
    const merchant = c.env.LANKAQR_MERCHANT_NAME || 'WorkBench'
    if (!qrUrl) {
        return c.json({ enabled: false, message: 'LANKAQR is not configured yet. Set LANKAQR_QR_URL.' })
    }
    return c.json({
        enabled: true,
        merchant_name: merchant,
        qr_url: qrUrl,
        amount: PLANS.pro.price,
        currency: PLANS.pro.currency,
        period_days: 30,
        instructions: [
            'Open your bank app and scan the LANKAQR code.',
            `Pay exactly ${PLANS.pro.currency} ${PLANS.pro.price} to ${merchant}.`,
            'Enter the payment reference / transaction ID below and submit.',
            'Pro activates once we verify the payment (usually within a few hours).',
        ],
    })
})

// POST /lankaqr/submit — shop submits the bank reference after paying
subscription.post('/lankaqr/submit', authMiddleware, async (c) => {
    const user = c.get('user')
    const { reference, note } = await c.req.json()

    if (!reference || String(reference).trim().length < 3) {
        return c.json({ error: 'A valid payment reference is required.' }, 400)
    }

    // Only one open submission at a time
    const existing = await c.env.DB.prepare(
        `SELECT id FROM payment_submissions WHERE user_id = ? AND status = 'pending'`
    ).bind(user.uid).first()
    if (existing) {
        return c.json({ error: 'You already have a pending payment under review.' }, 409)
    }

    const id = uuidv4()
    await c.env.DB.prepare(
        `INSERT INTO payment_submissions (id, user_id, method, amount, currency, reference, note, status, period_days)
         VALUES (?, ?, 'lankaqr', ?, ?, ?, ?, 'pending', 30)`
    ).bind(
        id, user.uid, PLANS.pro.price, PLANS.pro.currency,
        String(reference).trim(), note ? String(note).slice(0, 500) : null
    ).run()

    return c.json({ ok: true, id, status: 'pending', message: 'Payment submitted. Pro will activate once verified.' })
})

// GET /lankaqr/pending — admin: list payments awaiting verification
subscription.get('/lankaqr/pending', authMiddleware, async (c) => {
    const user = c.get('user')
    if (!isAdmin(c, user)) return c.json({ error: 'Forbidden: admin only' }, 403)

    const rows = await c.env.DB.prepare(
        `SELECT p.id, p.user_id, p.amount, p.currency, p.reference, p.note, p.created_at,
                u.email, u.shop_name
         FROM payment_submissions p JOIN users u ON p.user_id = u.id
         WHERE p.status = 'pending' ORDER BY p.created_at ASC`
    ).all()
    return c.json(rows.results || [])
})

// POST /lankaqr/review — admin: approve (grant Pro) or reject a submission
subscription.post('/lankaqr/review', authMiddleware, async (c) => {
    const user = c.get('user')
    if (!isAdmin(c, user)) return c.json({ error: 'Forbidden: admin only' }, 403)

    const { id, action, days } = await c.req.json()
    if (!id || !['approve', 'reject'].includes(action)) {
        return c.json({ error: 'id and action ("approve"|"reject") required' }, 400)
    }

    const sub = await c.env.DB.prepare(`SELECT * FROM payment_submissions WHERE id = ?`).bind(id).first()
    if (!sub) return c.json({ error: 'Submission not found' }, 404)
    if (sub.status !== 'pending') return c.json({ error: `Already ${sub.status}` }, 409)

    if (action === 'approve') {
        const period = Number(days) || (sub.period_days as number) || 30
        const expires = await grantPro(c.env.DB, sub.user_id as string, period, 'lankaqr_payment')
        await c.env.DB.prepare(
            `UPDATE payment_submissions SET status='approved', reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP WHERE id=?`
        ).bind(user.email, id).run()
        return c.json({ ok: true, status: 'approved', expires_at: expires })
    } else {
        await c.env.DB.prepare(
            `UPDATE payment_submissions SET status='rejected', reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP WHERE id=?`
        ).bind(user.email, id).run()
        return c.json({ ok: true, status: 'rejected' })
    }
})

export default subscription
