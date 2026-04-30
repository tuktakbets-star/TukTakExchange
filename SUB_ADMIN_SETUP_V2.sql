-- SUB ADMIN SYSTEM SETUP (UPDATED)
-- Run this in the Supabase SQL Editor.

-- 1. Create sub_admins table
CREATE TABLE IF NOT EXISTS sub_admins (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Hashed
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  wallet_balance NUMERIC(15,2) DEFAULT 0.00,
  status TEXT DEFAULT 'active', -- active, inactive, suspended
  is_online BOOLEAN DEFAULT false,
  created_by TEXT, -- Admin ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create sub_admin_logs
CREATE TABLE IF NOT EXISTS sub_admin_logs (
  id BIGSERIAL PRIMARY KEY,
  sub_admin_id BIGINT REFERENCES sub_admins(id),
  action_type TEXT NOT NULL,
  order_id TEXT,
  user_id TEXT,
  amount NUMERIC(15,2),
  status TEXT,
  note TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create sub_admin_wallet_transactions
CREATE TABLE IF NOT EXISTS sub_admin_wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  sub_admin_id BIGINT REFERENCES sub_admins(id),
  type TEXT NOT NULL,
  amount NUMERIC(15,2),
  reason TEXT,
  order_id TEXT,
  balance_after NUMERIC(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create sub_admin_devices
CREATE TABLE IF NOT EXISTS sub_admin_devices (
  id BIGSERIAL PRIMARY KEY,
  sub_admin_id BIGINT REFERENCES sub_admins(id),
  device_name TEXT,
  ip_address TEXT,
  browser TEXT,
  logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_current BOOLEAN DEFAULT false
);

-- 5. Create sub_admin_login_attempts (Fixed with id and RLS)
CREATE TABLE IF NOT EXISTS sub_admin_login_attempts (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  locked_until TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for all tables
ALTER TABLE sub_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admin_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admin_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Public Read SubAdmins" ON sub_admins;
DROP POLICY IF EXISTS "Public Manage Login Attempts" ON sub_admin_login_attempts;
DROP POLICY IF EXISTS "Public All Logs" ON sub_admin_logs;
DROP POLICY IF EXISTS "Public All Wallet Tx" ON sub_admin_wallet_transactions;
DROP POLICY IF EXISTS "Public All Devices" ON sub_admin_devices;

-- Create Policies
CREATE POLICY "Public Read SubAdmins" ON sub_admins FOR SELECT USING (true);
CREATE POLICY "Public Manage Login Attempts" ON sub_admin_login_attempts FOR ALL USING (true);
CREATE POLICY "Public All Logs" ON sub_admin_logs FOR ALL USING (true);
CREATE POLICY "Public All Wallet Tx" ON sub_admin_wallet_transactions FOR ALL USING (true);
CREATE POLICY "Public All Devices" ON sub_admin_devices FOR ALL USING (true);

-- Ensure Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sub_admins; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sub_admin_logs; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sub_admin_wallet_transactions; EXCEPTION WHEN others THEN NULL; END;
END $$;
