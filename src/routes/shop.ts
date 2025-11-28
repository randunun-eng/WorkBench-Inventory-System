import { Hono } from 'hono'

const shop = new Hono<{ Bindings: any }>()

// Get All Active Shops
shop.get('/', async (c) => {
  const shops = await c.env.DB.prepare(`
    SELECT id, shop_name, shop_slug, logo_r2_key
    FROM users 
    WHERE is_active = 1 AND is_approved = 1
  `).all()

  return c.json(shops.results)
})

// Get Shop by Slug
shop.get('/:slug', async (c) => {
  const slug = c.req.param('slug')

  // Fetch Shop Details
  const user = await c.env.DB.prepare(`
    SELECT id, shop_name, shop_slug, public_contact_info, location_lat, location_lng, location_address, logo_r2_key
    FROM users 
    WHERE shop_slug = ?
  `).bind(slug).first()

  if (!user) {
    return c.json({ error: 'Shop not found' }, 404)
  }

  // Parse JSON fields
  if (user.public_contact_info && typeof user.public_contact_info === 'string') {
    user.public_contact_info = JSON.parse(user.public_contact_info as string)
  }

  // Fetch Public Inventory
  const { limit, offset } = c.req.query()

  // Join catalog_items and shop_inventory
  // Only show items that are public (catalog level) AND in this shop's inventory
  // We could also filter by shop_inventory.is_visible_to_network if that's the intention,
  // but for now we'll stick to catalog_items.is_public as the main visibility flag for the public store.
  const items = await c.env.DB.prepare(`
    SELECT 
      c.id, 
      c.name, 
      c.description, 
      c.specifications, 
      si.price, 
      si.currency, 
      c.primary_image_r2_key, 
      c.datasheet_r2_key,
      si.stock_qty
    FROM catalog_items c
    JOIN shop_inventory si ON c.id = si.catalog_item_id
    WHERE si.shop_id = ? AND c.is_public = 1 AND si.is_visible_to_network = 1
    LIMIT ? OFFSET ?
  `).bind(user.id, limit || 20, offset || 0).all()

  // Parse specifications for items and add shop details
  const parsedItems = items.results.map((item: any) => ({
    ...item,
    specifications: typeof item.specifications === 'string' ? JSON.parse(item.specifications) : item.specifications,
    shop_name: user.shop_name,
    shop_slug: user.shop_slug
  }))

  return c.json({
    shop: user,
    inventory: parsedItems
  })
})

import { verifyToken } from '../auth'

async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Update Shop Profile
shop.put('/profile', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.split(' ')[1]
  const user = await verifyToken(token)
  if (!user) return c.json({ error: 'Invalid token' }, 401)

  const { shop_name, contact_info, location, password, logo_r2_key } = await c.req.json()
  const updates: any[] = []
  const values: any[] = []

  if (shop_name) {
    updates.push('shop_name = ?')
    values.push(shop_name)
  }

  if (contact_info) {
    updates.push('public_contact_info = ?')
    values.push(JSON.stringify(contact_info))
  }

  if (location) {
    if (location.lat !== undefined) {
      updates.push('location_lat = ?')
      values.push(location.lat)
    }
    if (location.lng !== undefined) {
      updates.push('location_lng = ?')
      values.push(location.lng)
    }
    if (location.address !== undefined) {
      updates.push('location_address = ?')
      values.push(location.address)
    }
  }

  if (logo_r2_key) {
    updates.push('logo_r2_key = ?')
    values.push(logo_r2_key)
  }

  if (password) {
    const hash = await hashPassword(password)
    updates.push('password_hash = ?')
    values.push(hash)
  }

  if (updates.length === 0) {
    return c.json({ message: 'No changes provided' })
  }

  values.push(user.uid) // user.uid comes from verifyToken payload

  await c.env.DB.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run()

  return c.json({ success: true })
})

export default shop
