-- Add product categories
INSERT OR IGNORE INTO categories (id, parent_id, name, slug) VALUES
  (1, NULL, 'Switch Gears', 'switch-gears'),
  (2, NULL, 'Semiconductors', 'semiconductors'),
  (3, NULL, 'Solar Equipment', 'solar'),
  (4, NULL, 'EV Infrastructure', 'ev-infra'),
  (5, NULL, 'Passive Components', 'passive');

-- Add subcategories for Switch Gears
INSERT OR IGNORE INTO categories (parent_id, name, slug) VALUES
  (1, 'MCB (AC)', 'mcb-ac'),
  (1, 'MCCB', 'mccb'),
  (1, 'Contactors', 'contactors');

-- Add subcategories for Semiconductors
INSERT OR IGNORE INTO categories (parent_id, name, slug) VALUES
  (2, 'IGBT Modules', 'igbt'),
  (2, 'MOSFETs', 'mosfets'),
  (2, 'Diodes', 'diodes');

-- Add subcategories for Solar Equipment
INSERT OR IGNORE INTO categories (parent_id, name, slug) VALUES
  (3, 'Inverters', 'inverters'),
  (3, 'MPPT Controllers', 'mppt');

-- Add subcategories for EV Infrastructure
INSERT OR IGNORE INTO categories (parent_id, name, slug) VALUES
  (4, 'Chargers', 'chargers'),
  (4, 'Connectors', 'connectors');

-- Add subcategories for Passive Components
INSERT OR IGNORE INTO categories (parent_id, name, slug) VALUES
  (5, 'Capacitors', 'capacitors'),
  (5, 'Resistors', 'resistors');
