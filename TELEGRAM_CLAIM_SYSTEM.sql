-- TELEGRAM CLAIM SYSTEM SETUP
-- Run this in the Supabase SQL Editor.

-- 1. Add telegram_id to sub_admins for identification
ALTER TABLE sub_admins ADD COLUMN IF NOT EXISTS telegram_id TEXT;

-- 2. Add claim fields to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS claim_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS assigned_sub_admin_id BIGINT; -- Reference to sub_admins(id)

-- 3. Create a unique index for sub_admins.telegram_id to prevent duplicate registrations
-- (Optional, but recommended)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_admins_telegram_id ON sub_admins(telegram_id);

-- 4. Enable RLS or update policies if needed (sub_admins and transactions are already enabled)
