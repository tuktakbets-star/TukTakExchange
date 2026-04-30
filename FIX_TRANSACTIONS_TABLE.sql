-- FIX TRANSACTIONS TABLE SCHEMA
-- This script ensures all required columns exist in the transactions table.
-- Run this in the Supabase SQL Editor.

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

-- Use a DO block to safely add columns if they don't exist
DO $$ 
BEGIN
    -- Core Fields
    BEGIN ALTER TABLE transactions ADD COLUMN method TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN description TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN proof_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN transaction_code TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Exchange / Transfer Specific
    BEGIN ALTER TABLE transactions ADD COLUMN target_amount NUMERIC; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN target_currency TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN target_country TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN account_type TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN fee NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN total_to_deduct NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Info Bundles
    BEGIN ALTER TABLE transactions ADD COLUMN receiver_info JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN bank_info JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Admin / Dispute Fields
    BEGIN ALTER TABLE transactions ADD COLUMN rejection_reason TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN admin_proof TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN dispute_reason TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN disputed_at TIMESTAMP WITH TIME ZONE; EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Legacy / Extra Fields
    BEGIN ALTER TABLE transactions ADD COLUMN source_amount NUMERIC; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN source_currency TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN country TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- Fix RLS Policies for Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Select" ON transactions;
DROP POLICY IF EXISTS "Public Insert" ON transactions;
DROP POLICY IF EXISTS "Public Update" ON transactions;
DROP POLICY IF EXISTS "Public Delete" ON transactions;

CREATE POLICY "Public Select" ON transactions FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON transactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON transactions FOR DELETE USING (true);

-- Ensure table is in realtime publication
DO $$ 
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    EXCEPTION WHEN others THEN
        NULL;
    END;
END $$;

-- Force a PostgREST schema reload hint (by adding a dummy comment)
COMMENT ON TABLE transactions IS 'Transactions table for Tuktak Exchange - Last Updated 2026-04-29';
