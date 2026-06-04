import { Hono } from 'hono'
import { authMiddleware } from '../auth'
import { v4 as uuidv4 } from 'uuid'
import { sendSellerOrderNotification } from '../utils/email'

// Marketplace orders. Buyers (guests allowed) place one order per seller and
// pay that seller directly via LANKAQR; the seller confirms receipt.
const orders = new Hono<{ Bindings: any, Variables: { user: any } }>()

// -----------------------------------------------------------------------------
// POST /  — create an order for ONE seller (public/guest). Prices and stock are
// validated server-side; never trust client prices.
// body: { shop_slug, buyer:{name,phone,email?,address?}, items:[{catalog_item_id, qty}] }
// -----------------------------------------------------------------------------
orders.post('/', async (c) => {
    const { shop_slug, buyer, items } = await c.req.json()

    if (!shop_slug || !Array.isArray(items) || items.length === 0) {
        return c.json({ error: 'shop_slug and items are required' }, 400)
    }
    if (!buyer?.name || !buyer?.phone) {
        return c.json({ error: 'Buyer name and phone are required' }, 400)
    }

    const shop = await c.env.DB.prepare(`
        SELECT u.id, u.shop_name, u.email, p.accepts_payments
        FROM users u LEFT JOIN shop_payment_details p ON u.id = p.shop_id
        WHERE u.shop_slug = ? AND u.is_active = 1 AND u.is_approved = 1
    `).bind(shop_slug).first()

    if (!shop) return c.json({ error: 'Shop not found' }, 404)
    if (!shop.accepts_payments) {
        return c.json({ error: 'This shop is not accepting orders yet.' }, 400)
    }

    // Validate each line against the shop's actual inventory + price
    let subtotal = 0
    let currency = 'LKR'
    const validated: any[] = []
    for (const it of items) {
        const row = await c.env.DB.prepare(`
            SELECT c.name, si.price, si.currency, si.stock_qty
            FROM catalog_items c JOIN shop_inventory si ON c.id = si.catalog_item_id
            WHERE c.id = ? AND si.shop_id = ?
        `).bind(it.catalog_item_id, shop.id).first()

        if (!row) return c.json({ error: 'An item is not available from this shop.' }, 400)
        const qty = Math.max(1, parseInt(it.qty) || 1)
        if (row.stock_qty != null && qty > (row.stock_qty as number)) {
            return c.json({ error: `Only ${row.stock_qty} of ${row.name} in stock.` }, 400)
        }
        const price = Number(row.price) || 0
        currency = (row.currency as string) || currency
        const line = price * qty
        subtotal += line
        validated.push({ catalog_item_id: it.catalog_item_id, name: row.name, unit_price: price, qty, line_total: line })
    }

    const orderId = uuidv4()
    const stmts = [
        c.env.DB.prepare(`
            INSERT INTO orders (id, shop_id, buyer_name, buyer_phone, buyer_email, buyer_address, subtotal, currency, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment')
        `).bind(orderId, shop.id, buyer.name, buyer.phone, buyer.email || null, buyer.address || null, subtotal, currency),
        ...validated.map(v => c.env.DB.prepare(`
            INSERT INTO order_items (id, order_id, catalog_item_id, name, unit_price, qty, line_total)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(uuidv4(), orderId, v.catalog_item_id, v.name, v.unit_price, v.qty, v.line_total)),
    ]
    await c.env.DB.batch(stmts)

    // Notify the seller a new order arrived (best-effort)
    if (c.env.RESEND_API_KEY && shop.email) {
        c.executionCtx.waitUntil(sendSellerOrderNotification(c.env.RESEND_API_KEY, {
            sellerEmail: shop.email as string, shopName: shop.shop_name as string,
            orderId, buyerName: buyer.name, buyerPhone: buyer.phone,
            total: subtotal, currency, stage: 'placed',
        }))
    }

    return c.json({ ok: true, order_id: orderId, shop_name: shop.shop_name, subtotal, currency, status: 'pending_payment' }, 201)
})

// -----------------------------------------------------------------------------
// GET /shop — seller's own orders (auth). MUST be declared before GET /:id.
// -----------------------------------------------------------------------------
orders.get('/shop', authMiddleware, async (c) => {
    const user = c.get('user')
    const status = c.req.query('status')

    let q = `SELECT * FROM orders WHERE shop_id = ?`
    const binds: any[] = [user.uid]
    if (status) { q += ` AND status = ?`; binds.push(status) }
    q += ` ORDER BY created_at DESC LIMIT 100`

    const rows = await c.env.DB.prepare(q).bind(...binds).all()
    const list = rows.results || []
    for (const o of list) {
        const items = await c.env.DB.prepare(
            `SELECT name, unit_price, qty, line_total FROM order_items WHERE order_id = ?`
        ).bind((o as any).id).all()
        ;(o as any).items = items.results
    }
    return c.json(list)
})

// -----------------------------------------------------------------------------
// POST /:id/payment — buyer submits the bank reference after paying (public)
// -----------------------------------------------------------------------------
orders.post('/:id/payment', async (c) => {
    const id = c.req.param('id')
    const { reference } = await c.req.json()
    if (!reference || String(reference).trim().length < 3) {
        return c.json({ error: 'A valid payment reference is required.' }, 400)
    }
    const order = await c.env.DB.prepare(`
        SELECT o.id, o.status, o.subtotal, o.currency, o.buyer_name, o.buyer_phone,
               u.email AS seller_email, u.shop_name
        FROM orders o JOIN users u ON o.shop_id = u.id WHERE o.id = ?
    `).bind(id).first()
    if (!order) return c.json({ error: 'Order not found' }, 404)
    if (order.status !== 'pending_payment') {
        return c.json({ error: `Order is already ${order.status}.` }, 409)
    }
    await c.env.DB.prepare(
        `UPDATE orders SET payment_reference = ?, status = 'payment_submitted', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(String(reference).trim(), id).run()

    // Tell the seller to verify + confirm (best-effort)
    if (c.env.RESEND_API_KEY && order.seller_email) {
        c.executionCtx.waitUntil(sendSellerOrderNotification(c.env.RESEND_API_KEY, {
            sellerEmail: order.seller_email as string, shopName: order.shop_name as string,
            orderId: id, buyerName: order.buyer_name as string, buyerPhone: order.buyer_phone as string,
            total: order.subtotal as number, currency: order.currency as string, stage: 'paid',
        }))
    }

    return c.json({ ok: true, status: 'payment_submitted' })
})

// -----------------------------------------------------------------------------
// POST /:id/confirm — seller confirms payment received → mark paid + decrement stock
// -----------------------------------------------------------------------------
orders.post('/:id/confirm', authMiddleware, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const order = await c.env.DB.prepare(`SELECT * FROM orders WHERE id = ? AND shop_id = ?`).bind(id, user.uid).first()
    if (!order) return c.json({ error: 'Order not found' }, 404)
    if (order.status === 'paid' || order.status === 'fulfilled') {
        return c.json({ error: 'Order already confirmed.' }, 409)
    }

    const items = await c.env.DB.prepare(`SELECT catalog_item_id, qty FROM order_items WHERE order_id = ?`).bind(id).all()
    const stmts: any[] = [
        c.env.DB.prepare(`UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(id),
    ]
    for (const it of (items.results || []) as any[]) {
        if (it.catalog_item_id) {
            stmts.push(c.env.DB.prepare(
                `UPDATE shop_inventory SET stock_qty = MAX(0, stock_qty - ?) WHERE shop_id = ? AND catalog_item_id = ?`
            ).bind(it.qty, user.uid, it.catalog_item_id))
        }
    }
    await c.env.DB.batch(stmts)
    return c.json({ ok: true, status: 'paid' })
})

// -----------------------------------------------------------------------------
// POST /:id/fulfill — seller marks the order handed over / shipped (auth)
// -----------------------------------------------------------------------------
orders.post('/:id/fulfill', authMiddleware, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const res = await c.env.DB.prepare(
        `UPDATE orders SET status = 'fulfilled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND shop_id = ? AND status = 'paid'`
    ).bind(id, user.uid).run()
    if (!res.meta || res.meta.changes === 0) {
        return c.json({ error: 'Order not found or not yet paid.' }, 409)
    }
    return c.json({ ok: true, status: 'fulfilled' })
})

// -----------------------------------------------------------------------------
// POST /:id/reject — seller rejects/cancels the order (auth)
// -----------------------------------------------------------------------------
orders.post('/:id/reject', authMiddleware, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const order = await c.env.DB.prepare(`SELECT id FROM orders WHERE id = ? AND shop_id = ?`).bind(id, user.uid).first()
    if (!order) return c.json({ error: 'Order not found' }, 404)
    await c.env.DB.prepare(
        `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(id).run()
    return c.json({ ok: true, status: 'cancelled' })
})

// -----------------------------------------------------------------------------
// GET /lookup?phone= — a guest buyer looks up their own orders by phone.
// Declared before GET /:id so "lookup" isn't treated as an order id.
// -----------------------------------------------------------------------------
orders.get('/lookup', async (c) => {
    const phone = (c.req.query('phone') || '').trim()
    if (phone.length < 4) return c.json({ error: 'Enter your phone number.' }, 400)
    const rows = await c.env.DB.prepare(`
        SELECT o.id, o.status, o.subtotal, o.currency, o.created_at, u.shop_name
        FROM orders o JOIN users u ON o.shop_id = u.id
        WHERE o.buyer_phone = ? ORDER BY o.created_at DESC LIMIT 50
    `).bind(phone).all()
    return c.json(rows.results || [])
})

// -----------------------------------------------------------------------------
// GET /:id — public order view (confirmation / status page). Declared last.
// -----------------------------------------------------------------------------
orders.get('/:id', async (c) => {
    const id = c.req.param('id')
    const order = await c.env.DB.prepare(`
        SELECT o.*, u.shop_name, u.shop_slug
        FROM orders o JOIN users u ON o.shop_id = u.id
        WHERE o.id = ?
    `).bind(id).first()
    if (!order) return c.json({ error: 'Order not found' }, 404)
    const items = await c.env.DB.prepare(
        `SELECT name, unit_price, qty, line_total FROM order_items WHERE order_id = ?`
    ).bind(id).all()
    return c.json({ ...order, items: items.results })
})

export default orders
