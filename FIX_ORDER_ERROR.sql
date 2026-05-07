-- FINAL FIX FOR ORDER ERROR (record "new" has no field "user_name" or "full_name")
-- Run this in Supabase SQL Editor.

-- 1. Add missing columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Ensure sub_admins table is ready for telegram IDs
ALTER TABLE sub_admins ADD COLUMN IF NOT EXISTS telegram_id TEXT;

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
