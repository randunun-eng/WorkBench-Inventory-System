-- Migration number: 0002 	 2024-11-27T00:00:00.000Z
CREATE TABLE IF NOT EXISTS inventory_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_item_id TEXT NOT NULL,
    user_id TEXT NOT NULL, -- Who made the change
    change_amount INTEGER NOT NULL, -- e.g. +5 or -2
    new_qty INTEGER NOT NULL, -- Snapshot of qty after change
    reason TEXT, -- "Restock", "Damaged", etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_logs_item ON inventory_logs(inventory_item_id);
