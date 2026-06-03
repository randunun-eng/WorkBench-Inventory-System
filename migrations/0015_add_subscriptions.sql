-- Migration: Subscriptions (Freemium — AI features are Pro)
--
-- Plan model lives on the users row (one active plan per shop). A separate
-- audit table records PayHere payment callbacks.

ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN plan_status TEXT DEFAULT 'active'; -- active | trialing | canceled | expired
ALTER TABLE users ADD COLUMN plan_started_at TIMESTAMP;          -- set once a trial/subscription begins (also blocks repeat trials)
ALTER TABLE users ADD COLUMN plan_expires_at TIMESTAMP;          -- trial end or current period end
ALTER TABLE users ADD COLUMN payhere_subscription_id TEXT;       -- PayHere recurring token / subscription id

-- Audit log of payment gateway callbacks
CREATE TABLE IF NOT EXISTS subscription_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    event_type TEXT,            -- e.g. 'payhere_notify', 'trial_started', 'manual_grant'
    payhere_payment_id TEXT,
    amount REAL,
    currency TEXT,
    status_code TEXT,
    raw JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id);
