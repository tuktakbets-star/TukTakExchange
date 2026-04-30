-- FOOLPROOF Supabase Setup Script
-- Run this in your Supabase SQL Editor.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables to ensure a clean state (WARNING: This deletes existing data)
-- If you want to keep data, just comment out the DROP lines.
-- DROP TABLE IF EXISTS admin_settings;
-- DROP TABLE IF EXISTS rates;
-- DROP TABLE IF EXISTS transactions;
-- DROP TABLE IF EXISTS wallets;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS chat_messages;

-- 1. Create Tables with UUID as Text for compatibility
CREATE TABLE IF NOT EXISTS admin_settings (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rates (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  base TEXT DEFAULT 'VND',
  target TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  effective_date TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(target)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  uid TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  amount NUMERIC DEFAULT 0,
  currency TEXT NOT NULL,
  source_amount NUMERIC,
  source_currency TEXT,
  country TEXT,
  proof_url TEXT,
  transaction_code TEXT,
  description TEXT,
  rejection_reason TEXT,
  admin_proof TEXT,
  target_amount NUMERIC,
  target_currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY, -- "uid_currency"
  uid TEXT NOT NULL,
  currency TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  pending_locked NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  phone_number TEXT,
  account_number TEXT,
  role TEXT DEFAULT 'user',
  kyc_status TEXT DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  uid TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  tx_id TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tx_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Force Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. DROP old policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Public select all" ON admin_settings;
DROP POLICY IF EXISTS "Public insert all" ON admin_settings;
DROP POLICY IF EXISTS "Public update all" ON admin_settings;

DROP POLICY IF EXISTS "Public select all" ON rates;
DROP POLICY IF EXISTS "Public insert all" ON rates;
DROP POLICY IF EXISTS "Public update all" ON rates;

DROP POLICY IF EXISTS "Public select all" ON transactions;
DROP POLICY IF EXISTS "Public insert all" ON transactions;
DROP POLICY IF EXISTS "Public update all" ON transactions;

DROP POLICY IF EXISTS "Public select all" ON wallets;
DROP POLICY IF EXISTS "Public insert all" ON wallets;
DROP POLICY IF EXISTS "Public update all" ON wallets;

DROP POLICY IF EXISTS "Public select all" ON users;
DROP POLICY IF EXISTS "Public insert all" ON users;
DROP POLICY IF EXISTS "Public update all" ON users;

DROP POLICY IF EXISTS "Public select all" ON notifications;
DROP POLICY IF EXISTS "Public insert all" ON notifications;
DROP POLICY IF EXISTS "Public update all" ON notifications;

DROP POLICY IF EXISTS "Public select all" ON chat_messages;
DROP POLICY IF EXISTS "Public insert all" ON chat_messages;
DROP POLICY IF EXISTS "Public update all" ON chat_messages;

-- 4. Create Simple Public Policies (Ensure both USING and WITH CHECK are true)
CREATE POLICY "Public select all" ON admin_settings FOR SELECT USING (true);
CREATE POLICY "Public insert all" ON admin_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update all" ON admin_settings FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public select all" ON rates FOR SELECT USING (true);
CREATE POLICY "Public insert all" ON rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update all" ON rates FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public select all" ON transactions FOR SELECT USING (true);
CREATE POLICY "Public insert all" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update all" ON transactions FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public select all" ON wallets FOR SELECT USING (true);
CREATE POLICY "Public insert all" ON wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update all" ON wallets FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public select all" ON users FOR SELECT USING (true);
CREATE POLICY "Public insert all" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update all" ON users FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public select all" ON notifications FOR SELECT USING (true);
CREATE POLICY "Public insert all" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update all" ON notifications FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public select all" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Public insert all" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update all" ON chat_messages FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Enable Realtime (Safest way)
-- First check if publication exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to publication individually (safest for cross-compatibility)
ALTER PUBLICATION supabase_realtime ADD TABLE admin_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE rates;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Note: If tables were already added, the above might throw "already exists".
-- That's okay, as long as they ARE in the publication.
