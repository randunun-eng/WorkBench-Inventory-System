-- Migration: Per-seller payment details (marketplace)
--
-- Each shop stores its own LANKAQR / bank details so buyers pay the seller
-- directly. One row per shop. is_active flips on once the shop has a usable
-- QR (or bank details), which gates whether buyers can check out from them.

CREATE TABLE IF NOT EXISTS shop_payment_details (
    shop_id TEXT PRIMARY KEY,            -- user_id
    business_name TEXT,
    business_reg_no TEXT,
    account_name TEXT,
    bank_name TEXT,
    bank_branch TEXT,
    account_number TEXT,
    lankaqr_merchant_id TEXT,            -- MID issued by bank/LankaPay, if any
    lankaqr_qr_r2_key TEXT,              -- uploaded static LANKAQR image (R2 key)
    contact_phone TEXT,
    contact_email TEXT,
    payment_instructions TEXT,           -- free text shown to buyers at checkout
    accepts_payments BOOLEAN DEFAULT 0,  -- seller toggle: ready to receive orders
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES users(id)
);
