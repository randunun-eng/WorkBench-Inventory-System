-- Migration number: 0004 	 2024-11-27T00:00:00.000Z

-- Trigger on INSERT
CREATE TRIGGER IF NOT EXISTS inventory_ai AFTER INSERT ON inventory_items BEGIN
  INSERT INTO inventory_fts(rowid, name, description, specifications)
  VALUES (new.rowid, new.name, new.description, new.specifications);
END;

-- Trigger on DELETE
CREATE TRIGGER IF NOT EXISTS inventory_ad AFTER DELETE ON inventory_items BEGIN
  INSERT INTO inventory_fts(inventory_fts, rowid, name, description, specifications)
  VALUES('delete', old.rowid, old.name, old.description, old.specifications);
END;

-- Trigger on UPDATE
CREATE TRIGGER IF NOT EXISTS inventory_au AFTER UPDATE ON inventory_items BEGIN
  INSERT INTO inventory_fts(inventory_fts, rowid, name, description, specifications)
  VALUES('delete', old.rowid, old.name, old.description, old.specifications);
  INSERT INTO inventory_fts(rowid, name, description, specifications)
  VALUES (new.rowid, new.name, new.description, new.specifications);
END;
