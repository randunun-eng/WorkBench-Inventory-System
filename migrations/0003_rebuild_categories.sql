-- Migration number: 0003 	 2024-11-27T00:00:00.000Z

-- 1. Create a safe haven for existing items
INSERT OR IGNORE INTO categories (id, name, slug) VALUES (999, 'Uncategorized', 'uncategorized');

-- 2. Move all items to this safe haven
UPDATE inventory_items SET category_id = 999;

-- 3. Break existing category hierarchy to avoid FK issues when deleting
UPDATE categories SET parent_id = NULL WHERE id != 999;

-- 4. Delete all old categories
DELETE FROM categories WHERE id != 999;

-- 5. Insert New Roots
INSERT INTO categories (id, name, slug) VALUES 
(1, 'Electrical', 'electrical'),
(2, 'Electronic', 'electronic'),
(3, 'PC Accessories', 'pc-accessories'),
(4, 'Power Tools', 'power-tools'),
(5, 'Miscellaneous', 'misc');

-- 6. Insert Subcategories
-- Electrical (ID 1)
INSERT INTO categories (parent_id, name, slug) VALUES 
(1, 'Switch Gears', 'switch-gears-elec'),
(1, 'Cables & Wires', 'cables-wires'),
(1, 'Lighting', 'lighting'),
(1, 'Circuit Protection', 'circuit-protection');

-- Electronic (ID 2)
INSERT INTO categories (parent_id, name, slug) VALUES 
(2, 'Semiconductors', 'semiconductors-elec'),
(2, 'Passive Components', 'passive-components'),
(2, 'Sensors', 'sensors'),
(2, 'Development Boards', 'dev-boards'),
(2, 'Modules', 'modules');

-- PC Accessories (ID 3)
INSERT INTO categories (parent_id, name, slug) VALUES 
(3, 'Cables & Adapters', 'pc-cables'),
(3, 'Peripherals', 'peripherals'),
(3, 'Storage', 'storage'),
(3, 'Networking', 'networking');

-- Power Tools (ID 4)
INSERT INTO categories (parent_id, name, slug) VALUES 
(4, 'Drills & Drivers', 'drills'),
(4, 'Saws', 'saws'),
(4, 'Grinders', 'grinders'),
(4, 'Sanders', 'sanders');

-- Miscellaneous (ID 5)
-- (Already added as root)
