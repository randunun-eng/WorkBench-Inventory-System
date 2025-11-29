import { Hono } from 'hono'
import { authMiddleware } from '../auth'

type Variables = {
    user: any
}

const network = new Hono<{ Bindings: any, Variables: Variables }>()

network.use('*', authMiddleware)

// Search Network Inventory
network.get('/search', async (c) => {
    const { q, limit, offset } = c.req.query()
    const user = c.get('user') // Current user

    if (!q) {
        return c.json({ error: 'Query parameter "q" is required' }, 400)
    }

    // Search catalog items from OTHER shops that are marked as visible to network
    const results = await c.env.DB.prepare(`
        SELECT
            c.id, c.name, c.description, c.specifications,
            c.primary_image_r2_key, c.datasheet_r2_key,
            si.stock_qty, si.price, si.currency, si.shareable_qty,
            u.shop_name, u.shop_slug, u.public_contact_info,
            fts.rank
        FROM catalog_fts fts
        JOIN catalog_items c ON fts.rowid = c.rowid
        JOIN shop_inventory si ON c.id = si.catalog_item_id
        JOIN users u ON si.shop_id = u.id
        WHERE
            catalog_fts MATCH ?
            AND si.is_visible_to_network = 1
            AND si.shop_id != ? -- Exclude own items
            AND si.stock_qty > 0
            AND u.is_active = 1 AND u.is_approved = 1
        ORDER BY rank
        LIMIT ? OFFSET ?
    `).bind(q, user.uid, limit || 20, offset || 0).all()

    // Parse specifications for each item
    const parsedResults = results.results.map((item: any) => ({
        ...item,
        specifications: item.specifications && typeof item.specifications === 'string'
            ? JSON.parse(item.specifications)
            : item.specifications,
        public_contact_info: item.public_contact_info && typeof item.public_contact_info === 'string'
            ? JSON.parse(item.public_contact_info)
            : item.public_contact_info
    }))

    return c.json(parsedResults)
})

export default network
