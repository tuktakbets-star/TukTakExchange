-- FIX MISSING COLUMNS IN transactions TABLE
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS admin_proof TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sub_admin_action TEXT,
ADD COLUMN IF NOT EXISTS sub_admin_actioned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_sub_admin_id UUID REFERENCES sub_admins(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS source_info TEXT,
ADD COLUMN IF NOT EXISTS sender_number TEXT,
ADD COLUMN IF NOT EXISTS total_to_deduct NUMERIC;

-- ENSURE sub_admins HAS ALL NECESSARY COLUMNS
ALTER TABLE sub_admins
ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percent',
ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS allowed_services TEXT[],
ADD COLUMN IF NOT EXISTS service_commissions JSONB DEFAULT '{}'::jsonb;

-- FIX RLS FOR transactions (Allow sub-admins to update transactions)
-- Note: Replace the policy if it already exists or just ensure it's there
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' AND policyname = 'Allow sub-admins to update'
    ) THEN
        CREATE POLICY "Allow sub-admins to update" ON transactions
        FOR UPDATE
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ENSURE sub_admin_logs TABLE EXISTS
CREATE TABLE IF NOT EXISTS sub_admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_admin_id UUID REFERENCES sub_admins(id),
    action_type TEXT,
    order_id TEXT,
    user_id TEXT,
    amount NUMERIC,
    status TEXT,
    note TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ENSURE sub_admin_wallet_transactions TABLE EXISTS
CREATE TABLE IF NOT EXISTS sub_admin_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_admin_id UUID REFERENCES sub_admins(id),
    type TEXT, -- 'credit' or 'debit'
    amount NUMERIC,
    reason TEXT,
    order_id TEXT,
    balance_after NUMERIC,
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable replication for real-time updates
-- This is critical for the "Waiting" page to update automatically
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Publication might not exist yet, let's try to create it if it doesn't
        NULL; 
END $$;

-- Enable RLS and add basic policies for logs/wallet transactions
ALTER TABLE sub_admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admin_wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_admin_logs' AND policyname = 'Public read') THEN
        CREATE POLICY "Public read" ON sub_admin_logs FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_admin_logs' AND policyname = 'Public insert') THEN
        CREATE POLICY "Public insert" ON sub_admin_logs FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_admin_wallet_transactions' AND policyname = 'Public read') THEN
        CREATE POLICY "Public read" ON sub_admin_wallet_transactions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_admin_wallet_transactions' AND policyname = 'Public insert') THEN
        CREATE POLICY "Public insert" ON sub_admin_wallet_transactions FOR INSERT WITH CHECK (true);
    END IF;
END $$;
