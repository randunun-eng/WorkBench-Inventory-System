import { Hono } from 'hono'

const search = new Hono<{ Bindings: any }>()

// Get single product by ID (public)
search.get('/product/:id', async (c) => {
    const id = c.req.param('id')

    const product = await c.env.DB.prepare(`
        SELECT
            c.id, c.name, c.description, c.specifications,
            c.primary_image_r2_key, c.datasheet_r2_key,
            si.price, si.currency, si.stock_qty,
            u.shop_name, u.shop_slug
        FROM catalog_items c
        LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.is_visible_to_network = 1
        LEFT JOIN users u ON si.shop_id = u.id
        WHERE c.id = ? AND c.is_public = 1 AND u.is_active = 1 AND u.is_approved = 1
    `).bind(id).first()

    if (!product) {
        return c.json({ error: 'Product not found' }, 404)
    }

    // Parse specifications if it's a string
    if (product.specifications && typeof product.specifications === 'string') {
        product.specifications = JSON.parse(product.specifications)
    }

    return c.json(product)
})

search.get('/', async (c) => {
    const { q, limit, offset } = c.req.query()

    // If no query, return all public products
    if (!q || q.trim() === '') {
        const results = await c.env.DB.prepare(`
            SELECT
                c.id, c.name, c.description, c.specifications,
                c.primary_image_r2_key, c.datasheet_r2_key,
                si.price, si.currency, si.stock_qty,
                u.shop_name, u.shop_slug
            FROM catalog_items c
            LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.is_visible_to_network = 1
            LEFT JOIN users u ON si.shop_id = u.id
            WHERE c.is_public = 1 AND u.is_active = 1 AND u.is_approved = 1
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `).bind(limit || 20, offset || 0).all()

        // Parse specifications for each product
        const parsedResults = results.results.map((item: any) => ({
            ...item,
            specifications: item.specifications && typeof item.specifications === 'string'
                ? JSON.parse(item.specifications)
                : item.specifications
        }))

        return c.json(parsedResults)
    }

    // FTS5 Search Query
    // Join with catalog_items and shop_inventory to get full details
    const results = await c.env.DB.prepare(`
    SELECT
      c.id, c.name, c.description, c.specifications,
      c.primary_image_r2_key, c.datasheet_r2_key,
      si.price, si.currency, si.stock_qty,
      u.shop_name, u.shop_slug,
      fts.rank
    FROM catalog_fts fts
    JOIN catalog_items c ON fts.rowid = c.rowid
    LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.is_visible_to_network = 1
    LEFT JOIN users u ON si.shop_id = u.id
    WHERE
      catalog_fts MATCH ?
      AND c.is_public = 1
      AND u.is_active = 1 AND u.is_approved = 1
    ORDER BY rank
    LIMIT ? OFFSET ?
  `).bind(q, limit || 20, offset || 0).all()

    // Parse specifications for each product
    const parsedResults = results.results.map((item: any) => ({
        ...item,
        specifications: item.specifications && typeof item.specifications === 'string'
            ? JSON.parse(item.specifications)
            : item.specifications
    }))

    return c.json(parsedResults)
})

export default search
