import { Context, Next } from 'hono'
import { sign, verify } from 'hono/jwt'

const JWT_SECRET = 'your-secret-key-change-this-in-prod' // TODO: Move to env vars

export async function generateToken(payload: any) {
    return await sign(payload, JWT_SECRET)
}

export async function verifyToken(token: string) {
    try {
        return await verify(token, JWT_SECRET)
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
    const payload = await verifyToken(token)

    if (!payload) {
        return c.json({ error: 'Invalid token' }, 401)
    }

    c.set('user', payload)
    await next()
}
