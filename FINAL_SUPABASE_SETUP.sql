-- FINAL SUPABASE SETUP (THE MOST ROBUST VERSION)
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Click "New Query"
-- 3. Paste ALL the code below and click "Run"
-- 4. If you see any "already exists" errors, that is NORMAL and means it is already set up correctly.
-- 5. AFTER RUNNING, REFRESH YOUR SITE AND TRY AGAIN.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CREATE OR UPDATE TABLES
-- We use individual ALTER TABLE commands to ensure all columns exist without losing data.

-- admin_settings
CREATE TABLE IF NOT EXISTS admin_settings (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- rates
CREATE TABLE IF NOT EXISTS rates (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  base TEXT DEFAULT 'VND',
  target TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  effective_date TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(target)
);

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  uid TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  amount NUMERIC DEFAULT 0,
  currency TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to transactions one by one
DO $$ 
BEGIN
    BEGIN ALTER TABLE transactions ADD COLUMN source_amount NUMERIC; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN source_currency TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN country TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN proof_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN transaction_code TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN description TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN rejection_reason TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN admin_proof TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN target_amount NUMERIC; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN target_currency TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN bank_info JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN method TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- wallets
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY, 
  uid TEXT NOT NULL,
  currency TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  pending_locked NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- users
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

-- notifications
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

-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tx_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ENABLE RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. DROP EXISTING POLICIES TO AVOID DUPLICATES
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || pol.tablename;
  END LOOP;
END $$;

-- 5. CREATE SIMPLE PUBLIC ACCESS POLICIES
-- NOTE: For production, you should restrict these. But for testing, we use public access.

CREATE POLICY "Public Select" ON admin_settings FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON admin_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON admin_settings FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public Select" ON rates FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON rates FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public Select" ON transactions FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON transactions FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public Select" ON wallets FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON wallets FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public Select" ON users FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON users FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public Select" ON notifications FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON notifications FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public Select" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON chat_messages FOR UPDATE USING (true) WITH CHECK (true);

-- 6. ENABLE REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to publication, catching errors if they are already added
DO $$ 
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE admin_settings; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE rates; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE transactions; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE wallets; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE users; EXCEPTION WHEN others THEN NULL; END;
END $$;
