-- Finalize RLS and ensure all tables exist correctly
-- Run this in Supabase SQL Editor

-- 1. Create Wallets Table if not exists
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY, -- uid_currency
    uid UUID NOT NULL REFERENCES users(uid),
    currency TEXT NOT NULL,
    balance DECIMAL(20, 2) DEFAULT 0,
    pending_locked DECIMAL(20, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Sub-Admin Wallet Transactions
CREATE TABLE IF NOT EXISTS sub_admin_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_admin_id UUID NOT NULL REFERENCES sub_admins(id),
    type TEXT NOT NULL, -- credit / debit
    amount DECIMAL(20, 2) NOT NULL,
    reason TEXT,
    order_id TEXT,
    balance_after DECIMAL(20, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admin_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Wallets
DROP POLICY IF EXISTS "Users can view their own wallets" ON wallets;
CREATE POLICY "Users can view their own wallets" ON wallets
FOR SELECT USING (auth.uid() = uid);

DROP POLICY IF EXISTS "Admins can manage all wallets" ON wallets;
CREATE POLICY "Admins can manage all wallets" ON wallets
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
);

-- 5. Policies for Transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions
FOR SELECT USING (auth.uid() = uid);

DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
CREATE POLICY "Users can create transactions" ON transactions
FOR INSERT WITH CHECK (auth.uid() = uid);

DROP POLICY IF EXISTS "Operators can view assigned transactions" ON transactions;
CREATE POLICY "Operators can view assigned transactions" ON transactions
FOR SELECT USING (
    EXISTS (SELECT 1 FROM sub_admins WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Operators can update assigned transactions" ON transactions;
CREATE POLICY "Operators can update assigned transactions" ON transactions
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sub_admins WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
);

-- 6. Policies for Dispute Messages
DROP POLICY IF EXISTS "Participants can view dispute messages" ON dispute_messages;
CREATE POLICY "Participants can view dispute messages" ON dispute_messages
FOR SELECT USING (
    auth.uid() = sender_id OR
    EXISTS (SELECT 1 FROM transactions t WHERE t.id = tx_id AND (t.uid = auth.uid() OR t.assigned_sub_admin_id = auth.uid())) OR
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Participants can insert dispute messages" ON dispute_messages;
CREATE POLICY "Participants can insert dispute messages" ON dispute_messages
FOR INSERT WITH CHECK (
    auth.uid() = sender_id
);

-- 7. Grant access to service role just in case
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;

-- Notify user to reload
COMMENT ON TABLE transactions IS 'RLS Policies Updated - Please refresh app if errors persist';
