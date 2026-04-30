-- Supabase Setup Script (Robust Version)
-- Copy and run this script in the Supabase SQL Editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Tables
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
  id TEXT PRIMARY KEY, -- usually "uid_currency"
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

-- 2. Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. Create Basic Policies (Public Access for now to ensure everything works)
-- We use DO blocks to avoid "policy already exists" errors.

DO $$ 
BEGIN
    -- admin_settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read admin_settings' AND tablename = 'admin_settings') THEN
        CREATE POLICY "Public read admin_settings" ON admin_settings FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public manage admin_settings' AND tablename = 'admin_settings') THEN
        CREATE POLICY "Public manage admin_settings" ON admin_settings FOR ALL USING (true);
    END IF;

    -- rates
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read rates' AND tablename = 'rates') THEN
        CREATE POLICY "Public read rates" ON rates FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public manage rates' AND tablename = 'rates') THEN
        CREATE POLICY "Public manage rates" ON rates FOR ALL USING (true);
    END IF;

    -- transactions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public manage transactions' AND tablename = 'transactions') THEN
        CREATE POLICY "Public manage transactions" ON transactions FOR ALL USING (true);
    END IF;

    -- wallets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public manage wallets' AND tablename = 'wallets') THEN
        CREATE POLICY "Public manage wallets" ON wallets FOR ALL USING (true);
    END IF;

    -- users
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public manage users' AND tablename = 'users') THEN
        CREATE POLICY "Public manage users" ON users FOR ALL USING (true);
    END IF;

    -- notifications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public manage notifications' AND tablename = 'notifications') THEN
        CREATE POLICY "Public manage notifications" ON notifications FOR ALL USING (true);
    END IF;

    -- chat_messages
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public manage chat_messages' AND tablename = 'chat_messages') THEN
        CREATE POLICY "Public manage chat_messages" ON chat_messages FOR ALL USING (true);
    END IF;
END $$;

-- 4. Enable Realtime
-- Use DO to avoid error if already member
DO $$ 
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE admin_settings;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Skip if already added
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE rates;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
