-- Rebuild FTS index for catalog_items
-- The previous migration created the table but may not have populated it correctly

-- Clear existing FTS data
DELETE FROM catalog_fts;

-- Repopulate FTS index from catalog_items
INSERT INTO catalog_fts (rowid, name, description, specifications)
SELECT rowid, name, description, specifications
FROM catalog_items;
