-- SUB ADMIN SYSTEM SETUP
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
  created_by TEXT, -- Admin ID (UUID from Supabase Auth or custom ID)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create sub_admin_logs
CREATE TABLE IF NOT EXISTS sub_admin_logs (
  id BIGSERIAL PRIMARY KEY,
  sub_admin_id BIGINT REFERENCES sub_admins(id),
  action_type TEXT NOT NULL, -- add_money, cash_in, exchange, withdraw, recharge
  order_id TEXT, -- ID from transactions table
  user_id TEXT, -- UID from users table
  amount NUMERIC(15,2),
  status TEXT, -- approved, rejected, mark_as_paid
  note TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create sub_admin_wallet_transactions
CREATE TABLE IF NOT EXISTS sub_admin_wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  sub_admin_id BIGINT REFERENCES sub_admins(id),
  type TEXT NOT NULL, -- debit, credit
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

-- 5. Create support_messages
CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  order_id TEXT,
  appeal_id TEXT,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL, -- user, sub_admin, admin
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create appeals
CREATE TABLE IF NOT EXISTS appeals (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT,
  user_id TEXT,
  subject TEXT,
  description TEXT,
  status TEXT DEFAULT 'open', -- open, in_progress, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Modify transactions (orders) table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS assigned_sub_admin_id BIGINT REFERENCES sub_admins(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sub_admin_action TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sub_admin_actioned_at TIMESTAMP WITH TIME ZONE;

-- 8. Add login rate limiting table (simplified for now)
CREATE TABLE IF NOT EXISTS sub_admin_login_attempts (
  username TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  locked_until TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for all new tables
ALTER TABLE sub_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admin_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admin_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

-- Basic Public Access for development (Should be hardened later)
CREATE POLICY "Public Read SubAdmins" ON sub_admins FOR SELECT USING (true);
CREATE POLICY "Public All Logs" ON sub_admin_logs FOR ALL USING (true);
CREATE POLICY "Public All Wallet Tx" ON sub_admin_wallet_transactions FOR ALL USING (true);
CREATE POLICY "Public All Devices" ON sub_admin_devices FOR ALL USING (true);
CREATE POLICY "Public All Messages" ON support_messages FOR ALL USING (true);
CREATE POLICY "Public All Appeals" ON appeals FOR ALL USING (true);

-- Ensure realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sub_admins; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sub_admin_logs; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sub_admin_wallet_transactions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE support_messages; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE appeals; EXCEPTION WHEN others THEN NULL; END;
END $$;
