-- Migration: Marketplace orders (buyer → seller)
--
-- One order per seller (a multi-seller cart splits into multiple orders, each
-- paid to that seller's own LANKAQR). Manual payment confirmation: buyer
-- submits a bank reference, seller confirms receipt, which decrements stock.

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,                 -- UUID
    shop_id TEXT NOT NULL,               -- seller (users.id)
    buyer_name TEXT,
    buyer_phone TEXT,
    buyer_email TEXT,
    buyer_address TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'LKR',
    status TEXT NOT NULL DEFAULT 'pending_payment', -- pending_payment | payment_submitted | paid | fulfilled | cancelled
    payment_method TEXT DEFAULT 'lankaqr',
    payment_reference TEXT,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    catalog_item_id TEXT,
    name TEXT,
    unit_price REAL,
    qty INTEGER,
    line_total REAL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
