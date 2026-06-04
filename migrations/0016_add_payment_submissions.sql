-- Migration: LANKAQR manual payment submissions
--
-- Shop pays via your static LANKAQR merchant QR, then submits the bank
-- reference. An admin verifies the funds landed and approves, which grants
-- Pro for the period. Zero gateway commission (direct bank QR).

CREATE TABLE IF NOT EXISTS payment_submissions (
    id TEXT PRIMARY KEY,                       -- UUID
    user_id TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'lankaqr',
    amount REAL,
    currency TEXT DEFAULT 'LKR',
    reference TEXT,                            -- bank/transaction reference entered by the shop
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',    -- pending | approved | rejected
    period_days INTEGER DEFAULT 30,
    reviewed_by TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_paysub_status ON payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_paysub_user ON payment_submissions(user_id);
