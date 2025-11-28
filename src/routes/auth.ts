import { Hono } from 'hono'
import { generateToken } from '../auth'
import { v4 as uuidv4 } from 'uuid'
import { sendAdminNotificationResend } from '../utils/email'

// Simple password hashing (replace with bcrypt/argon2 in production if possible,
// but for Workers, we might need a WebCrypto compatible one or just use a simple hash for this demo if constrained)
// For this environment, we'll use a simple SHA-256 hash for demonstration as bcrypt can be heavy for Workers without specific bindings/flags.
// ideally we use `crypto.subtle`

async function hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const auth = new Hono<{ Bindings: any }>()

auth.post('/signup', async (c) => {
    const { email, password, shop_name } = await c.req.json()

    if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400)
    }

    const id = crypto.randomUUID()
    const password_hash = await hashPassword(password)
    const shop_slug = shop_name ? shop_name.toLowerCase().replace(/ /g, '-') : id

    // Auto-approve admin email
    const is_approved = email === c.env.ADMIN_EMAIL ? 1 : 0

    try {
        await c.env.DB.prepare(
            'INSERT INTO users (id, email, password_hash, shop_name, shop_slug, is_approved, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
        ).bind(id, email, password_hash, shop_name, shop_slug, is_approved).run()

        // Send admin notification email
        const adminEmail = c.env.ADMIN_EMAIL || 'randunun@gmail.com';
        const resendApiKey = c.env.RESEND_API_KEY;

        if (resendApiKey) {
            c.executionCtx.waitUntil(
                sendAdminNotificationResend(resendApiKey, {
                    adminEmail,
                    shopName: shop_name,
                    email,
                    shopSlug: shop_slug,
                    userId: id
                })
            );
        } else {
            console.log('RESEND_API_KEY not configured - email notification skipped');
        }

        const token = await generateToken({ uid: id, email })
        return c.json({ token, user: { id, email, shop_name, shop_slug, is_approved } })
    } catch (e: any) {
        return c.json({ error: 'User already exists or database error', details: e.message }, 400)
    }
})

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json()
    const password_hash = await hashPassword(password)

    const user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ? AND password_hash = ?'
    ).bind(email, password_hash).first()

    if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    if (!user.is_active) {
        return c.json({ error: 'Account is inactive. Please contact support.' }, 403)
    }

    if (!user.is_approved) {
        return c.json({ error: 'Account pending approval. Please wait for admin verification.' }, 403)
    }

    const token = await generateToken({ uid: user.id, email: user.email })
    return c.json({ token, user })
})

// Request Password Reset
auth.post('/request-reset', async (c) => {
    const { email } = await c.req.json()

    const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (!user) {
        // Return success even if user not found to prevent enumeration
        return c.json({ success: true, message: 'If an account exists, a reset request has been sent.' })
    }

    // Mark as requested in DB for Admin Dashboard
    await c.env.DB.prepare('UPDATE users SET reset_requested_at = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run()

    return c.json({ success: true, message: 'Password reset request received. Please contact admin for approval.' })
})

// Reset Password (with Token)
auth.post('/reset-password', async (c) => {
    const { email, token, newPassword } = await c.req.json()

    const user = await c.env.DB.prepare(
        'SELECT id, reset_token_expiry FROM users WHERE email = ? AND reset_token = ?'
    ).bind(email, token).first()

    if (!user) {
        return c.json({ error: 'Invalid token or email' }, 400)
    }

    if (user.reset_token_expiry < Date.now()) {
        return c.json({ error: 'Token expired' }, 400)
    }

    const password_hash = await hashPassword(newPassword)

    await c.env.DB.prepare(
        'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?'
    ).bind(password_hash, user.id).run()

    return c.json({ success: true })
})

export default auth
