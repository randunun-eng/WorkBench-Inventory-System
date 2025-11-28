-- Migration: Add User Status and Password Reset Columns
-- Adds columns expected by auth.ts and shop.ts that were missing from initial schema

-- Add status columns with default 1 (true) to backfill existing users
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 1;

-- Add password reset columns
ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expiry INTEGER; -- Timestamp
ALTER TABLE users ADD COLUMN reset_requested_at TIMESTAMP;
