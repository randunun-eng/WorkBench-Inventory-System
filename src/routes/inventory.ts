import { Hono } from 'hono'
import { authMiddleware } from '../auth'
import { v4 as uuidv4 } from 'uuid'

type Variables = {
  user: any
}

const inventory = new Hono<{ Bindings: any, Variables: Variables }>()

inventory.use('*', authMiddleware)

// Create Item (Shared Catalog System)
// If item exists in catalog, just add shop_inventory entry
// If new item, create catalog_items entry + shop_inventory entry
inventory.post('/', async (c) => {
  const user = c.get('user')
  const {
    category_id, name, description, specifications, stock_qty, restock_threshold,
    price, landing_cost, currency, is_public, is_visible_to_network, shareable_qty,
    primary_image_r2_key, datasheet_r2_key
  } = await c.req.json()

  try {
    // Check if catalog item already exists (by name + category)
    const existingItem = await c.env.DB.prepare(`
      SELECT id FROM catalog_items
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
      AND category_id = ?
      LIMIT 1
    `).bind(name, parseInt(category_id) || null).first()

    let catalogItemId: string

    if (existingItem) {
      // Item exists in catalog, just add shop inventory
      catalogItemId = existingItem.id as string

      // Check if this shop already has this item
      const existingShopItem = await c.env.DB.prepare(`
        SELECT id FROM shop_inventory
        WHERE shop_id = ? AND catalog_item_id = ?
      `).bind(user.uid, catalogItemId).first()

      if (existingShopItem) {
        return c.json({ error: 'You already have this item in your inventory' }, 409)
      }
    } else {
      // Create new catalog item
      catalogItemId = uuidv4()
      await c.env.DB.prepare(`
        INSERT INTO catalog_items (
          id, category_id, name, description, specifications,
          datasheet_r2_key, primary_image_r2_key,
          created_by_user_id, is_public
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        catalogItemId,
        parseInt(category_id) || null,
        name,
        description,
        specifications ? JSON.stringify(specifications) : null,
        datasheet_r2_key || null,
        primary_image_r2_key || null,
        user.uid,
        is_public ? 1 : 0
      ).run()
    }

    // Create shop inventory entry
    const shopInventoryId = uuidv4()
    await c.env.DB.prepare(`
      INSERT INTO shop_inventory (
        id, shop_id, catalog_item_id, stock_qty, restock_threshold,
        price, landing_cost, currency, is_visible_to_network, shareable_qty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      shopInventoryId,
      user.uid,
      catalogItemId,
      parseInt(stock_qty) || 0,
      parseInt(restock_threshold) || 5,
      price ? parseFloat(price) : null,
      landing_cost ? parseFloat(landing_cost) : null,
      currency || 'LKR',
      is_visible_to_network ? 1 : 0,
      parseInt(shareable_qty) || 0
    ).run()

    return c.json({
      id: catalogItemId,
      shop_inventory_id: shopInventoryId,
      message: existingItem ? 'Item added to your inventory' : 'New item created and added to catalog'
    }, 201)
  } catch (e: any) {
    return c.json({ error: 'Failed to create item', details: e.message }, 500)
  }
})

// List Items (Private View) - Shows ALL catalog items with shop's stock
inventory.get('/', async (c) => {
  const user = c.get('user')
  const { limit, offset } = c.req.query()

  // Show all catalog items, with this shop's inventory (or 0 if not stocked)
  const items = await c.env.DB.prepare(`
    SELECT
      c.id,
      c.category_id,
      c.name,
      c.description,
      c.specifications,
      c.datasheet_r2_key,
      c.primary_image_r2_key,
      c.created_by_user_id,
      c.is_public,
      c.created_at,
      c.updated_at,
      COALESCE(si.stock_qty, 0) as stock_qty,
      COALESCE(si.restock_threshold, 5) as restock_threshold,
      si.price,
      si.landing_cost,
      si.currency,
      si.is_visible_to_network,
      si.shareable_qty,
      si.id as shop_inventory_id
    FROM catalog_items c
    LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.shop_id = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(user.uid, limit || 100, offset || 0).all()

  // Parse specifications
  const parsedItems = items.results.map((item: any) => ({
    ...item,
    specifications: item.specifications && typeof item.specifications === 'string'
      ? JSON.parse(item.specifications)
      : item.specifications
  }))

  return c.json(parsedItems)
})

// Get Item (with shop's inventory info)
inventory.get('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const item = await c.env.DB.prepare(`
    SELECT
      c.*,
      COALESCE(si.stock_qty, 0) as stock_qty,
      COALESCE(si.restock_threshold, 5) as restock_threshold,
      si.price,
      si.landing_cost,
      si.currency,
      si.is_visible_to_network,
      si.shareable_qty,
      si.id as shop_inventory_id
    FROM catalog_items c
    LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id AND si.shop_id = ?
    WHERE c.id = ?
  `).bind(user.uid, id).first()

  if (!item) return c.json({ error: 'Item not found' }, 404)

  // Parse JSON fields
  if (item.specifications && typeof item.specifications === 'string') {
    item.specifications = JSON.parse(item.specifications as string)
  }

  return c.json(item)
})

// Update Item
// - Catalog info (name, description, specs, datasheet): Only creator can update
// - Shop inventory (stock, price, visibility): Any shop can update their own
inventory.put('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id') // catalog_item_id
  const updates = await c.req.json()

  try {
    // Get catalog item to check ownership
    const catalogItem = await c.env.DB.prepare(`
      SELECT created_by_user_id FROM catalog_items WHERE id = ?
    `).bind(id).first()

    if (!catalogItem) return c.json({ error: 'Item not found' }, 404)

    const {
      name, description, specifications, datasheet_r2_key, primary_image_r2_key, is_public,
      stock_qty, restock_threshold, price, currency, is_visible_to_network, shareable_qty
    } = updates

    // Update catalog_items (only if user is creator)
    if (catalogItem.created_by_user_id === user.uid) {
      await c.env.DB.prepare(`
        UPDATE catalog_items SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          specifications = COALESCE(?, specifications),
          datasheet_r2_key = COALESCE(?, datasheet_r2_key),
          primary_image_r2_key = COALESCE(?, primary_image_r2_key),
          is_public = COALESCE(?, is_public),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        name ?? null,
        description ?? null,
        specifications ? JSON.stringify(specifications) : null,
        datasheet_r2_key ?? null,
        primary_image_r2_key ?? null,
        is_public !== undefined ? (is_public ? 1 : 0) : null,
        id
      ).run()
    }

    // Update or create shop_inventory entry
    const safeStockQty = isNaN(Number(stock_qty)) ? undefined : Number(stock_qty)
    const safeRestockThreshold = isNaN(Number(restock_threshold)) ? undefined : Number(restock_threshold)
    const safePrice = isNaN(Number(price)) ? undefined : Number(price)
    const safeLandingCost = isNaN(Number(updates.landing_cost)) ? undefined : Number(updates.landing_cost)
    const safeShareableQty = isNaN(Number(shareable_qty)) ? undefined : Number(shareable_qty)

    // Check if shop_inventory entry exists
    const shopInv = await c.env.DB.prepare(`
      SELECT id FROM shop_inventory WHERE shop_id = ? AND catalog_item_id = ?
    `).bind(user.uid, id).first()

    if (shopInv) {
      // Update existing shop inventory
      await c.env.DB.prepare(`
        UPDATE shop_inventory SET
          stock_qty = COALESCE(?, stock_qty),
          restock_threshold = COALESCE(?, restock_threshold),
          price = COALESCE(?, price),
          landing_cost = COALESCE(?, landing_cost),
          currency = COALESCE(?, currency),
          is_visible_to_network = COALESCE(?, is_visible_to_network),
          shareable_qty = COALESCE(?, shareable_qty),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        safeStockQty ?? null,
        safeRestockThreshold ?? null,
        safePrice ?? null,
        safeLandingCost ?? null,
        currency ?? null,
        is_visible_to_network !== undefined ? (is_visible_to_network ? 1 : 0) : null,
        safeShareableQty ?? null,
        shopInv.id
      ).run()
    } else if (stock_qty !== undefined || price !== undefined) {
      // Create shop inventory entry if updating stock/price but entry doesn't exist
      const shopInventoryId = uuidv4()
      await c.env.DB.prepare(`
        INSERT INTO shop_inventory (
          id, shop_id, catalog_item_id, stock_qty, restock_threshold,
          price, landing_cost, currency, is_visible_to_network, shareable_qty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        shopInventoryId,
        user.uid,
        id,
        safeStockQty || 0,
        safeRestockThreshold || 5,
        safePrice || null,
        safeLandingCost || null,
        currency || 'LKR',
        is_visible_to_network ? 1 : 0,
        safeShareableQty || 0
      ).run()
    }

    return c.json({ message: 'Item updated' })
  } catch (e: any) {
    return c.json({ error: 'Failed to update item', details: e.message }, 500)
  }
})

// Delete Item (removes shop's inventory entry only, not catalog item)
inventory.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id') // catalog_item_id

  // Delete only the shop_inventory entry
  await c.env.DB.prepare(`
    DELETE FROM shop_inventory WHERE catalog_item_id = ? AND shop_id = ?
  `).bind(id, user.uid).run()

  return c.json({ message: 'Item removed from your inventory' })
})

// Adjust Stock (updates shop_inventory)
inventory.post('/:id/adjust', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id') // catalog_item_id
  const { change_amount, reason } = await c.req.json()

  if (typeof change_amount !== 'number' || change_amount === 0) {
    return c.json({ error: 'Invalid change_amount' }, 400)
  }

  try {
    // Get shop inventory entry
    const shopInv = await c.env.DB.prepare(`
      SELECT id, stock_qty FROM shop_inventory
      WHERE catalog_item_id = ? AND shop_id = ?
    `).bind(id, user.uid).first()

    if (!shopInv) {
      return c.json({ error: 'You do not have this item in your inventory' }, 404)
    }

    const currentQty = (shopInv.stock_qty as number) || 0
    const newQty = currentQty + change_amount

    if (newQty < 0) {
      return c.json({ error: 'Insufficient stock', current_qty: currentQty }, 400)
    }

    // Update stock and log
    await c.env.DB.batch([
      c.env.DB.prepare(`
        UPDATE shop_inventory SET stock_qty = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(newQty, shopInv.id),
      c.env.DB.prepare(`
        INSERT INTO inventory_logs (inventory_item_id, user_id, change_amount, new_qty, reason)
        VALUES (?, ?, ?, ?, ?)
      `).bind(id, user.uid, change_amount, newQty, reason || 'Manual Adjustment')
    ])

    return c.json({ message: 'Stock adjusted', new_qty: newQty })
  } catch (e: any) {
    return c.json({ error: 'Failed to adjust stock', details: e.message }, 500)
  }
})

// Get Stock History
inventory.get('/:id/logs', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id') // catalog_item_id

  // Verify shop has this item
  const shopInv = await c.env.DB.prepare(`
    SELECT id FROM shop_inventory WHERE catalog_item_id = ? AND shop_id = ?
  `).bind(id, user.uid).first()

  if (!shopInv) return c.json({ error: 'Item not found in your inventory' }, 404)

  const logs = await c.env.DB.prepare(`
    SELECT * FROM inventory_logs
    WHERE inventory_item_id = ? AND user_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).bind(id, user.uid).all()

  return c.json(logs.results)
})

export default inventory
