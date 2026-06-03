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
