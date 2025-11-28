-- Drop existing problematic triggers
DROP TRIGGER IF EXISTS inventory_au;
DROP TRIGGER IF EXISTS inventory_ad;
DROP TRIGGER IF EXISTS inventory_ai;

-- Recreate triggers with standard SQL logic
CREATE TRIGGER inventory_ai AFTER INSERT ON inventory_items 
BEGIN 
  INSERT INTO inventory_fts(rowid, name, description, specifications) 
  VALUES (new.rowid, new.name, new.description, new.specifications); 
END;

CREATE TRIGGER inventory_ad AFTER DELETE ON inventory_items 
BEGIN 
  DELETE FROM inventory_fts WHERE rowid = old.rowid; 
END;

CREATE TRIGGER inventory_au AFTER UPDATE ON inventory_items 
BEGIN 
  DELETE FROM inventory_fts WHERE rowid = old.rowid; 
  INSERT INTO inventory_fts(rowid, name, description, specifications) 
  VALUES (new.rowid, new.name, new.description, new.specifications); 
END;
