# Shared Catalog System - Implementation Summary

## Overview

The WorkBench Inventory system has been upgraded to a **shared catalog architecture**, similar to how categories work. This eliminates data duplication and ensures all shops access the same product information with datasheets.

## How It Works

### Before (Old System)
- Each shop created their own inventory items
- Duplicate product entries across shops
- Each shop uploaded their own datasheet
- No centralized product catalog

### After (New System)
- **Master Catalog** (`catalog_items`) - Shared product database
- **Shop Inventory** (`shop_inventory`) - Each shop's stock quantities
- When Shop A adds a product → Creates catalog entry with datasheet
- All other shops see this product automatically (with 0 stock)
- Each shop updates their own stock quantity
- **No duplication** of product data or datasheets

## Architecture

### Database Schema

#### `catalog_items` (Master Catalog)
```sql
- id (UUID, Primary Key)
- category_id (Reference to categories)
- name (Product name)
- description
- specifications (JSON)
- datasheet_r2_key (Shared datasheet file)
- primary_image_r2_key (Shared product image)
- created_by_user_id (Shop that first added it)
- is_public (Visible to public search)
- created_at, updated_at
```

#### `shop_inventory` (Per-Shop Stock)
```sql
- id (UUID, Primary Key)
- shop_id (user_id - which shop)
- catalog_item_id (Reference to catalog_items)
- stock_qty (This shop's stock)
- restock_threshold
- price (This shop's price)
- currency
- is_visible_to_network (Share with other shops)
- shareable_qty (How many willing to share)
- created_at, updated_at
- UNIQUE(shop_id, catalog_item_id) - One entry per shop per item
```

### Full-Text Search
- `catalog_fts` - FTS5 index on catalog items (replaces `inventory_fts`)
- Automatically synced via triggers

## User Workflow

### Adding a New Product

**Scenario 1: Product doesn't exist in catalog**
1. Shop A adds "NCEP 15T14 MOSFET" with datasheet
2. System creates `catalog_items` entry
3. System creates `shop_inventory` entry for Shop A (stock: 10)
4. Shop B, C, D automatically see "NCEP 15T14" in their inventory (stock: 0)

**Scenario 2: Product already exists**
1. Shop B tries to add "NCEP 15T14"
2. System detects existing catalog entry
3. System only creates `shop_inventory` entry for Shop B
4. Datasheet remains the same (from Shop A)

### Viewing Inventory
- Shops see ALL catalog items
- Items with 0 stock = not yet stocked by this shop
- Items with >0 stock = stocked by this shop
- JOIN query: `catalog_items LEFT JOIN shop_inventory WHERE shop_id = current_user`

### Updating Products

**Catalog Info** (name, description, specs, datasheet):
- Only the **creator** can update
- Changes apply to all shops

**Stock Info** (price, quantity, visibility):
- Each shop updates their own
- Independent of other shops

## API Changes

### Inventory Endpoints

#### POST `/api/inventory` (Create Item)
**Changed behavior:**
- Checks if item exists in catalog (by name + category)
- If exists: Only creates shop_inventory entry
- If new: Creates catalog_items + shop_inventory entries
- Returns: `{ id: catalog_item_id, shop_inventory_id, message }`

#### GET `/api/inventory` (List Items)
**Changed behavior:**
- Returns ALL catalog items
- Includes shop's stock_qty (0 if not stocked)
- JOIN query: Shows complete catalog with shop-specific data

#### PUT `/api/inventory/:id` (Update Item)
**Changed behavior:**
- `id` = catalog_item_id
- Catalog updates (name, description, specs) - Only if creator
- Shop inventory updates (stock, price) - Always allowed for own shop

#### DELETE `/api/inventory/:id` (Delete Item)
**Changed behavior:**
- Removes shop_inventory entry only
- Does NOT delete catalog_items (other shops may use it)
- Message: "Item removed from your inventory"

### Search Endpoints

#### GET `/api/search` (Public Search)
**Changed query:**
```sql
SELECT c.*, si.stock_qty, si.price, u.shop_name
FROM catalog_items c
LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id
LEFT JOIN users u ON si.shop_id = u.id
WHERE c.is_public = 1
```

#### GET `/api/network/search` (Network Search)
**Changed query:**
```sql
SELECT c.*, si.stock_qty, si.price, u.shop_name
FROM catalog_fts fts
JOIN catalog_items c ON fts.rowid = c.rowid
JOIN shop_inventory si ON c.id = si.catalog_item_id
JOIN users u ON si.shop_id = u.id
WHERE catalog_fts MATCH ? AND si.is_visible_to_network = 1
```

### AI Chatbot

#### POST `/api/ai/chat`
**Changed query:**
```sql
SELECT c.name, c.description, c.datasheet_r2_key, si.stock_qty, si.price
FROM catalog_fts fts
JOIN catalog_items c ON fts.rowid = c.rowid
LEFT JOIN shop_inventory si ON c.id = si.catalog_item_id
WHERE catalog_fts MATCH ? AND c.is_public = 1
```

**Frontend Update:**
- Chatbot now displays datasheet links in search results
- Uses FileText icon + clickable link

## Frontend Changes

### Chatbot.tsx
**Added:**
- Import `FileText` from lucide-react
- Display datasheet link in search results
- Link format: `/api/images/{datasheet_r2_key}`

### InventoryList.tsx
**Compatible:**
- No changes required - API maintains backward compatibility
- Receives all catalog items with shop's stock

### Network.tsx
**Compatible:**
- Already displays datasheet links
- Updated backend query ensures correct data

## Migration Process

### Migration File: `0007_shared_catalog.sql`

1. **Create new tables**
   - catalog_items
   - shop_inventory

2. **Migrate existing data**
   - Copy inventory_items → catalog_items
   - Copy inventory_items → shop_inventory
   - Maintains all IDs and relationships

3. **Update FTS**
   - Drop inventory_fts
   - Create catalog_fts
   - Populate with catalog items
   - Add triggers for auto-sync

4. **Preserve old table**
   - inventory_items kept for verification
   - Can be dropped later

### Applied Successfully
```
✅ Remote database migration completed
✅ 3 catalog_items migrated
✅ 3 shop_inventory entries created
✅ FTS index rebuilt
✅ All datasheets preserved
```

## Public View & Datasheets

### Current Status
**Public items in catalog:** 2
1. **NCEP 15T14** (MOSFET)
   - Datasheet: ✅ Available
   - Public: ✅ Yes

2. **2SC3866** (Transistor)
   - Datasheet: ✅ Available
   - Public: ✅ Yes

### Access Points

1. **Global Chatbot** (`/dashboard` - Chatbot tab)
   - Can search public catalog
   - Displays datasheet links ✅ (NEW)
   - Powered by AI with FTS

2. **Network Search** (`/dashboard` - Network tab)
   - Can search other shops' inventory
   - Shows datasheet links ✅
   - Requires authentication

3. **Public API** (`/api/search`)
   - Returns public catalog with datasheets
   - No authentication required

## Testing Checklist

### Backend
- ✅ Create new item (creates catalog + shop_inventory)
- ✅ Add existing item (creates shop_inventory only)
- ✅ List inventory (shows all catalog items with shop stock)
- ✅ Update item (creator can edit catalog, all can edit stock)
- ✅ Delete item (removes shop_inventory, keeps catalog)
- ✅ Search public (includes datasheets)
- ✅ Search network (includes datasheets)
- ✅ AI chatbot search (includes datasheets)

### Frontend
- ✅ Chatbot displays datasheet links
- ✅ Network search displays datasheet links
- ✅ Inventory list shows all catalog items
- ✅ Items with 0 stock visible

### Database
- ✅ catalog_items table created
- ✅ shop_inventory table created
- ✅ catalog_fts index created
- ✅ FTS triggers working
- ✅ Data migrated correctly
- ✅ Datasheets preserved

## Benefits

1. **No Duplication** - Single source of truth for product data
2. **Shared Datasheets** - One datasheet per product, accessible to all
3. **Automatic Visibility** - New products instantly visible to all shops
4. **Independent Pricing** - Each shop sets their own price
5. **Stock Management** - Each shop manages their own inventory
6. **Scalable** - Works with thousands of shops
7. **Consistent Data** - Product specs updated by creator apply to all
8. **Public Access** - Datasheets available via chatbot and public search

## Deployment

**Deployed:** ✅ December 27, 2025
**URL:** https://workbench-inventory.randunun.workers.dev
**Status:** Production
**Database:** Remote (Cloudflare D1)

## Next Steps

### Immediate
1. ✅ Test multi-shop scenario
2. ✅ Verify datasheet access in chatbot
3. ✅ Confirm FTS search works

### Future Enhancements
1. **Suggest Similar Items** - When adding product, suggest existing catalog entries
2. **Datasheet Versioning** - Allow updates with history
3. **Product Ratings** - Shops rate product quality
4. **Bulk Import** - Import catalog from CSV
5. **Admin Dashboard** - Manage catalog centrally
6. **Duplicate Detection** - AI-powered duplicate finder
7. **Product Approval** - Review new catalog entries before publishing

## Rollback Plan (If Needed)

If issues arise, rollback steps:

1. Revert code to previous commit:
   ```bash
   git revert HEAD
   wrangler deploy
   ```

2. Database rollback:
   - inventory_items table still exists (not dropped)
   - Can restore API to use old table
   - No data loss occurred

## Support

For questions or issues:
- Check migration logs: `wrangler d1 migrations list workbench-db --remote`
- View data: `wrangler d1 execute workbench-db --remote --command "SELECT * FROM catalog_items"`
- Report issues: https://github.com/anthropics/claude-code/issues

---

**Implementation completed successfully** ✅
