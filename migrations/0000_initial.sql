-- Migration number: 0000 	 2024-11-26T00:00:00.000Z
-- Migration number: 0000 	 2024-11-26T00:00:00.000Z
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- UUID
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    shop_name TEXT,
    shop_slug TEXT UNIQUE,
    public_contact_info JSON,
    location_lat REAL,
    location_lng REAL,
    location_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_slug ON users(shop_slug);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    attributes_template JSON, 
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY, -- UUID
    user_id TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    specifications JSON,
    stock_qty INTEGER DEFAULT 0,
    restock_threshold INTEGER DEFAULT 5,
    price REAL,
    currency TEXT DEFAULT 'USD',
    datasheet_r2_key TEXT,
    primary_image_r2_key TEXT,
    is_public BOOLEAN DEFAULT 0,
    is_visible_to_network BOOLEAN DEFAULT 0,
    shareable_qty INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_items_user ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_public ON inventory_items(is_public) WHERE is_public = 1;
CREATE INDEX IF NOT EXISTS idx_items_network ON inventory_items(is_visible_to_network) WHERE is_visible_to_network = 1;

CREATE VIRTUAL TABLE IF NOT EXISTS inventory_fts USING fts5(
    name, 
    description, 
    specifications, 
    tokenize='trigram'
);

