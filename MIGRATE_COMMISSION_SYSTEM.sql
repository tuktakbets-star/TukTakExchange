-- SQL script to add commission columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_processed BOOLEAN DEFAULT FALSE;

-- Ensure sub_admin_wallet_transactions table exists
CREATE TABLE IF NOT EXISTS sub_admin_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_admin_id UUID REFERENCES sub_admins(id),
    type TEXT NOT NULL, -- 'credit' or 'debit' or 'commission'
    amount NUMERIC(15,2) NOT NULL,
    reason TEXT,
    order_id UUID REFERENCES transactions(id),
    balance_after NUMERIC(15,2),
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sub_admin_wallet_tx_sub_admin_id ON sub_admin_wallet_transactions(sub_admin_id);
CREATE INDEX IF NOT EXISTS idx_sub_admin_wallet_tx_order_id ON sub_admin_wallet_transactions(order_id);
