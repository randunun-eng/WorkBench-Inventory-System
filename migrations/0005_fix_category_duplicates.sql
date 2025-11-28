-- Migration number: 0005 	 2024-11-27T12:00:00.000Z

-- 1. Identify and remove duplicates, keeping the one with the lowest ID
DELETE FROM categories 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM categories 
    GROUP BY name, parent_id
);

-- 2. Create a unique index to prevent future duplicates
-- We include parent_id to allow same name under different parents (e.g. "Cables" under "Electrical" and "PC Accessories")
-- Use coalesce(parent_id, -1) if DB supports it, or just name/slug unique globally if that's the requirement.
-- The user said "catagory list must sync with all databases 100% same", implying a global standard list.
-- However, standard practice allows same sub-category name under different parents.
-- But "IGBT" under "Uncategorized" twice means they are both root (parent_id is null).
-- So we should enforce unique (name, parent_id).
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_name_parent ON categories(name, IFNULL(parent_id, -1));
