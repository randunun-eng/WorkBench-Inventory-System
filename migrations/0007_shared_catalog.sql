-- Migration: Shared Catalog System
-- When a shop adds an item, it creates a catalog entry visible to all shops
-- Each shop maintains their own stock quantity for catalog items

-- 1. Create the master catalog table
CREATE TABLE IF NOT EXISTS catalog_items (
    id TEXT PRIMARY KEY, -- UUID
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    specifications JSON,
    datasheet_r2_key TEXT,
    primary_image_r2_key TEXT,
    created_by_user_id TEXT NOT NULL, -- Shop that first added this item
    is_public BOOLEAN DEFAULT 0, -- Public to non-authenticated users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_category ON catalog_items(category_id);
CREATE INDEX IF NOT EXISTS idx_catalog_creator ON catalog_items(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_public ON catalog_items(is_public) WHERE is_public = 1;

-- 2. Create the shop-specific inventory table
CREATE TABLE IF NOT EXISTS shop_inventory (
    id TEXT PRIMARY KEY, -- UUID
    shop_id TEXT NOT NULL, -- user_id of the shop
    catalog_item_id TEXT NOT NULL, -- Reference to catalog_items
    stock_qty INTEGER DEFAULT 0,
    restock_threshold INTEGER DEFAULT 5,
    price REAL,
    currency TEXT DEFAULT 'USD',
    is_visible_to_network BOOLEAN DEFAULT 0, -- This shop shares it on network
    shareable_qty INTEGER DEFAULT 0, -- How many this shop is willing to share
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES users(id),
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE CASCADE,
    UNIQUE(shop_id, catalog_item_id) -- One entry per shop per catalog item
);

CREATE INDEX IF NOT EXISTS idx_shop_inv_shop ON shop_inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_inv_item ON shop_inventory(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_shop_inv_network ON shop_inventory(is_visible_to_network) WHERE is_visible_to_network = 1;

-- 3. Migrate existing inventory_items to new structure
-- Insert unique items into catalog_items (group by name to avoid duplicates)
INSERT INTO catalog_items (id, category_id, name, description, specifications, datasheet_r2_key, primary_image_r2_key, created_by_user_id, is_public, created_at, updated_at)
SELECT
    id,
    category_id,
    name,
    description,
    specifications,
    datasheet_r2_key,
    primary_image_r2_key,
    user_id,
    is_public,
    created_at,
    updated_at
FROM inventory_items;

-- Insert shop inventory records
INSERT INTO shop_inventory (id, shop_id, catalog_item_id, stock_qty, restock_threshold, price, currency, is_visible_to_network, shareable_qty, created_at, updated_at)
SELECT
    hex(randomblob(16)), -- Generate new UUID for shop_inventory
    user_id,
    id, -- catalog_item_id (same as old inventory_items id)
    stock_qty,
    restock_threshold,
    price,
    currency,
    is_visible_to_network,
    shareable_qty,
    created_at,
    updated_at
FROM inventory_items;

-- 4. Update FTS table to use catalog_items instead
DROP TABLE IF EXISTS inventory_fts;

CREATE VIRTUAL TABLE IF NOT EXISTS catalog_fts USING fts5(
    name,
    description,
    specifications,
    tokenize='trigram'
);

-- Populate FTS with catalog items
INSERT INTO catalog_fts (rowid, name, description, specifications)
SELECT rowid, name, description, specifications
FROM catalog_items;

-- 5. Create triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS catalog_fts_insert AFTER INSERT ON catalog_items BEGIN
    INSERT INTO catalog_fts (rowid, name, description, specifications)
    VALUES (NEW.rowid, NEW.name, NEW.description, NEW.specifications);
END;

CREATE TRIGGER IF NOT EXISTS catalog_fts_update AFTER UPDATE ON catalog_items BEGIN
    UPDATE catalog_fts
    SET name = NEW.name, description = NEW.description, specifications = NEW.specifications
    WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS catalog_fts_delete AFTER DELETE ON catalog_items BEGIN
    DELETE FROM catalog_fts WHERE rowid = OLD.rowid;
END;

-- 6. Keep old table for now (can drop later after verification)
-- DROP TABLE inventory_items;
