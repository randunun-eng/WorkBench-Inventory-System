import { Hono } from 'hono'
import { generateToken, getJwtSecret } from '../auth'
import { sendAdminNotificationResend } from '../utils/email'

const auth = new Hono<{ Bindings: any }>()

// =============================================================================
// Password hashing — salted SHA-256, backward compatible with legacy unsalted
// =============================================================================
//
// Stored format: `<saltHex>$<hashHex>`
//   - saltHex: 16 random bytes → 32 hex chars
//   - hashHex: SHA-256(salt || password) → 64 hex chars
//
// Legacy format (rows created before this change): bare 64-char hex SHA-256
// of the password with no salt. `verifyPassword` accepts both and the caller
// can lazy-rehash to the new format on successful legacy login.
//
// Why SHA-256 + salt and not bcrypt/argon2? Workers don't ship those, and
// the WASM ports are heavy. Salted SHA-256 defeats rainbow-table attacks
// (the main weakness of the previous unsalted version). For a follow-up,
// migrate to PBKDF2 via `crypto.subtle.deriveBits` (also Workers-native).

async function sha256Hex(input: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomSaltHex(byteLen = 16): string {
    const bytes = new Uint8Array(byteLen)
    crypto.getRandomValues(bytes)
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Hash a fresh password in the new salted format. */
async function hashPasswordSalted(password: string): Promise<string> {
    const salt = randomSaltHex()
    const hash = await sha256Hex(salt + password)
    return `${salt}$${hash}`
}

/** Constant-time string comparison (prevents timing side-channels). */
function timingSafeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return diff === 0
}

/**
 * Verify a password against a stored hash, supporting both new (salted) and
 * legacy (unsalted) formats. Returns:
 *   - `'valid-new'`  : matched, already in salted format
 *   - `'valid-old'`  : matched legacy format → caller should rehash & persist
 *   - `'invalid'`    : did not match
 */
async function verifyPassword(
    password: string,
    storedHash: string
): Promise<'valid-new' | 'valid-old' | 'invalid'> {
    if (storedHash.includes('$')) {
        // New format: <salt>$<hash>
        const [salt, hash] = storedHash.split('$', 2)
        if (!salt || !hash) return 'invalid'
        const candidate = await sha256Hex(salt + password)
        return timingSafeEqualHex(candidate, hash) ? 'valid-new' : 'invalid'
    } else {
        // Legacy format: bare SHA-256 of password
        const candidate = await sha256Hex(password)
        return timingSafeEqualHex(candidate, storedHash) ? 'valid-old' : 'invalid'
    }
}

// =============================================================================
// Routes
// =============================================================================

auth.post('/signup', async (c) => {
    const { email, password, shop_name } = await c.req.json()

    if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400)
    }
    if (password.length < 8) {
        return c.json({ error: 'Password must be at least 8 characters' }, 400)
    }

    let secret: string
    try {
        secret = getJwtSecret(c.env)
    } catch (e: any) {
        return c.json({ error: 'Server misconfigured', details: e.message }, 500)
    }

    const id = crypto.randomUUID()
    const password_hash = await hashPasswordSalted(password)
    const shop_slug = shop_name ? shop_name.toLowerCase().replace(/ /g, '-') : id

    // Auto-approve admin email
    const is_approved = email === c.env.ADMIN_EMAIL ? 1 : 0

    try {
        await c.env.DB.prepare(
            'INSERT INTO users (id, email, password_hash, shop_name, shop_slug, is_approved, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
        ).bind(id, email, password_hash, shop_name, shop_slug, is_approved).run()

        // Send admin notification email (best-effort, fire-and-forget)
        const adminEmail = c.env.ADMIN_EMAIL || 'randunun@gmail.com'
        const resendApiKey = c.env.RESEND_API_KEY

        if (resendApiKey) {
            c.executionCtx.waitUntil(
                sendAdminNotificationResend(resendApiKey, {
                    adminEmail,
                    shopName: shop_name,
                    email,
                    shopSlug: shop_slug,
                    userId: id
                })
            )
        } else {
            console.log('RESEND_API_KEY not configured - email notification skipped')
        }

        const token = await generateToken({ uid: id, email, shop_name, shop_slug }, secret)
        return c.json({ token, user: { id, email, shop_name, shop_slug, is_approved } })
    } catch (e: any) {
        return c.json({ error: 'User already exists or database error', details: e.message }, 400)
    }
})

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json()

    if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400)
    }

    let secret: string
    try {
        secret = getJwtSecret(c.env)
    } catch (e: any) {
        return c.json({ error: 'Server misconfigured', details: e.message }, 500)
    }

    const user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
    ).bind(email).first()

    // Generic message — don't leak which step failed (user vs password).
    if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    const verdict = await verifyPassword(password, user.password_hash as string)
    if (verdict === 'invalid') {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Lazy-migrate legacy unsalted hashes the moment a user logs in successfully.
    if (verdict === 'valid-old') {
        try {
            const newHash = await hashPasswordSalted(password)
            await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                .bind(newHash, user.id).run()
        } catch (e) {
            // Non-fatal: login still succeeds; we'll rehash on next login.
            console.error('Lazy rehash failed (will retry next login):', e)
        }
    }

    if (!user.is_active) {
        return c.json({ error: 'Account is inactive. Please contact support.' }, 403)
    }

    if (!user.is_approved) {
        return c.json({ error: 'Account pending approval. Please wait for admin verification.' }, 403)
    }

    const token = await generateToken({
        uid: user.id,
        email: user.email,
        shop_name: user.shop_name,
        shop_slug: user.shop_slug
    }, secret)

    // Never return password_hash to the client.
    const { password_hash, ...safeUser } = user as any
    return c.json({ token, user: safeUser })
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

    if (!newPassword || newPassword.length < 8) {
        return c.json({ error: 'Password must be at least 8 characters' }, 400)
    }

    const user = await c.env.DB.prepare(
        'SELECT id, reset_token_expiry FROM users WHERE email = ? AND reset_token = ?'
    ).bind(email, token).first()

    if (!user) {
        return c.json({ error: 'Invalid token or email' }, 400)
    }

    if ((user.reset_token_expiry as number) < Date.now()) {
        return c.json({ error: 'Token expired' }, 400)
    }

    const password_hash = await hashPasswordSalted(newPassword)

    await c.env.DB.prepare(
        'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?'
    ).bind(password_hash, user.id).run()

    return c.json({ success: true })
})

export default auth
