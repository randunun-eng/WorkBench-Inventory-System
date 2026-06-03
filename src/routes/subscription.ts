import { Hono } from 'hono'
import { authMiddleware } from '../auth'
import { PLANS, TRIAL_DAYS, isProRow, isAdmin } from '../subscription'

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
        const expires = new Date(Date.now() + (Number(days) || 30) * 24 * 60 * 60 * 1000).toISOString()
        await c.env.DB.batch([
            c.env.DB.prepare(
                `UPDATE users SET plan='pro', plan_status='active', plan_started_at=COALESCE(plan_started_at, CURRENT_TIMESTAMP), plan_expires_at=? WHERE id=?`
            ).bind(expires, target.id),
            c.env.DB.prepare(`INSERT INTO subscription_events (user_id, event_type) VALUES (?, 'manual_grant')`).bind(target.id),
        ])
        return c.json({ ok: true, email, plan: 'pro', expires_at: expires })
    } else {
        await c.env.DB.prepare(
            `UPDATE users SET plan='free', plan_status='canceled', plan_expires_at=NULL WHERE id=?`
        ).bind(target.id).run()
        return c.json({ ok: true, email, plan: 'free' })
    }
})

export default subscription
