import { Hono } from 'hono'
import { verifyToken } from '../auth'

const admin = new Hono<{ Bindings: any }>()

// Middleware to check if user is admin
const adminMiddleware = async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

    const token = authHeader.split(' ')[1]
    const user = await verifyToken(token)

    if (!user) return c.json({ error: 'Invalid token' }, 401)

    // Check if user is the admin
    if (user.email !== c.env.ADMIN_EMAIL) {
        return c.json({ error: 'Forbidden: Admin access required' }, 403)
    }

    c.set('user', user)
    await next()
}

admin.use('*', adminMiddleware)

// List all users
admin.get('/users', async (c) => {
    const users = await c.env.DB.prepare(`
        SELECT id, email, shop_name, is_active, is_approved, created_at, reset_token, reset_requested_at
        FROM users
        ORDER BY reset_requested_at DESC, created_at DESC
    `).all()
    return c.json(users.results)
})

// Approve user
admin.put('/users/:id/approve', async (c) => {
    const id = c.req.param('id')
    const { approved } = await c.req.json()

    await c.env.DB.prepare(`
        UPDATE users SET is_approved = ? WHERE id = ?
    `).bind(approved ? 1 : 0, id).run()

    return c.json({ success: true })
})

// Toggle active status
admin.put('/users/:id/status', async (c) => {
    const id = c.req.param('id')
    const { active } = await c.req.json()

    await c.env.DB.prepare(`
        UPDATE users SET is_active = ? WHERE id = ?
    `).bind(active ? 1 : 0, id).run()

    return c.json({ success: true })
})

async function hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Admin manually resets password
admin.put('/users/:id/reset-password', async (c) => {
    const id = c.req.param('id')
    const { newPassword } = await c.req.json()

    if (!newPassword) return c.json({ error: 'New password is required' }, 400)

    const password_hash = await hashPassword(newPassword)

    await c.env.DB.prepare(`
        UPDATE users 
        SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL, reset_requested_at = NULL 
        WHERE id = ?
    `).bind(password_hash, id).run()

    return c.json({ success: true })
})

// Approve password reset (Generate Token) - Keeping for legacy/alternative use
admin.post('/users/reset-password-approve', async (c) => {
    const { userId } = await c.req.json()

    // Generate a simple 6-digit token for manual communication
    const token = Math.floor(100000 + Math.random() * 900000).toString()
    const expiry = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

    await c.env.DB.prepare(`
        UPDATE users 
        SET reset_token = ?, reset_token_expiry = ? 
        WHERE id = ?
    `).bind(token, expiry, userId).run()

    return c.json({ success: true, token })
})

export default admin
