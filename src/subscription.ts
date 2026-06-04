import { Context, Next } from 'hono'

// =============================================================================
// Freemium plan model — AI features are Pro.
// =============================================================================
//
// Free  : browse, search, list inventory, public storefront chatbot.
// Pro   : AI datasheet analysis, AI spec generation, web-grounded lookups,
//         network sharing, analytics.
//
// Prices are LKR and editable here (single source of truth). Adjust before
// going live with PayHere.

export const PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'LKR',
        features: [
            'Public storefront & search',
            'List your inventory',
            'Buyer chatbot',
        ],
    },
    pro: {
        id: 'pro',
        name: 'WorkBench Pro',
        price: 1500,            // LKR / month — placeholder, confirm before launch
        currency: 'LKR',
        interval: '1 Month',    // PayHere recurrence string
        features: [
            'AI datasheet analysis (reads PDFs/images)',
            'AI spec generation',
            'AI web-grounded part lookup',
            'Share inventory on the shop network',
            'Inventory analytics',
        ],
    },
} as const

export const TRIAL_DAYS = 14

/** True if a users row represents an active Pro entitlement (incl. unexpired trial). */
export function isProRow(row: any): boolean {
    if (!row) return false
    const onPro = row.plan === 'pro' || row.plan_status === 'trialing'
    if (!onPro) return false
    if (row.plan_expires_at) {
        const exp = new Date(row.plan_expires_at).getTime()
        if (!isNaN(exp) && exp < Date.now()) return false // expired trial/period → treated as free
    }
    return true
}

/** Admin email always counts as Pro (so the owner can use everything). */
export function isAdmin(c: Context, user: any): boolean {
    return !!(user?.email && c.env.ADMIN_EMAIL && user.email === c.env.ADMIN_EMAIL)
}

/**
 * Grant (or extend) a Pro subscription for `days` and log the event.
 * Returns the new ISO expiry. Used by manual grants and approved LANKAQR
 * payments. Extends from the later of "now" and the current expiry so
 * renewals stack instead of truncating remaining time.
 */
export async function grantPro(
    db: any,
    userId: string,
    days = 30,
    eventType = 'manual_grant'
): Promise<string> {
    const row = await db.prepare('SELECT plan_expires_at FROM users WHERE id = ?').bind(userId).first()
    const current = row?.plan_expires_at ? new Date(row.plan_expires_at).getTime() : 0
    const base = Math.max(Date.now(), isNaN(current) ? 0 : current)
    const expires = new Date(base + days * 24 * 60 * 60 * 1000).toISOString()

    await db.batch([
        db.prepare(
            `UPDATE users SET plan='pro', plan_status='active',
             plan_started_at=COALESCE(plan_started_at, CURRENT_TIMESTAMP),
             plan_expires_at=? WHERE id=?`
        ).bind(expires, userId),
        db.prepare(`INSERT INTO subscription_events (user_id, event_type) VALUES (?, ?)`).bind(userId, eventType),
    ])
    return expires
}

/**
 * Middleware: require an active Pro plan. Must run AFTER authMiddleware
 * (it reads c.get('user')). Returns 402 Payment Required with an upgrade
 * hint when the user is on Free.
 */
export const requirePro = async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    if (isAdmin(c, user)) return next()

    const row = await c.env.DB.prepare(
        'SELECT plan, plan_status, plan_expires_at FROM users WHERE id = ?'
    ).bind(user.uid).first()

    if (!isProRow(row)) {
        return c.json({
            error: 'upgrade_required',
            message: 'This is a WorkBench Pro feature. Upgrade to use AI datasheet analysis, spec generation, and web-grounded part lookups.',
            plan: 'free',
            upgrade_url: '/pricing',
        }, 402)
    }

    await next()
}
