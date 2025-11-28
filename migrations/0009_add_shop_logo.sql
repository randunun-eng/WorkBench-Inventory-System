-- Migration: Add Shop Logo
-- Adds a column to store the R2 key for the shop's logo

ALTER TABLE users ADD COLUMN logo_r2_key TEXT;
