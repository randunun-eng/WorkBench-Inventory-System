import { Context, Next } from 'hono'
import { sign, verify } from 'hono/jwt'

// Read the JWT signing secret from the Worker environment.
// Set this with `wrangler secret put JWT_SECRET` (production) or in
// wrangler.toml [vars] for local dev. We intentionally throw instead of
// falling back to a hardcoded value — a default secret is the same as no
// secret, because anyone can read this source and forge tokens.
function getJwtSecret(env: any): string {
    const secret = env?.JWT_SECRET
    if (!secret || typeof secret !== 'string' || secret.length < 16) {
        throw new Error(
            'JWT_SECRET is not configured. Set it via `wrangler secret put JWT_SECRET` ' +
            'or in wrangler.toml [vars] (dev only). Minimum length: 16 characters.'
        )
    }
    return secret
}

export async function generateToken(payload: any, secret: string) {
    return await sign(payload, secret)
}

export async function verifyToken(token: string, secret: string) {
    try {
        return await verify(token, secret)
    } catch (e) {
        return null
    }
}

export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.split(' ')[1]

    let secret: string
    try {
        secret = getJwtSecret(c.env)
    } catch (e: any) {
        // Misconfiguration is a server error, not an auth failure.
        return c.json({ error: 'Server misconfigured', details: e.message }, 500)
    }

    const payload = await verifyToken(token, secret)

    if (!payload) {
        return c.json({ error: 'Invalid token' }, 401)
    }

    c.set('user', payload)
    await next()
}

// Exported for routes that need to mint tokens (signup, login, reset).
export { getJwtSecret }
