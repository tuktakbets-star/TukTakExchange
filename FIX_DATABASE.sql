-- FIX DATABASE SCRIPT
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard -> SQL Editor
-- 2. Click "New Query"
-- 3. Paste ALL the code below and click "Run"
-- 4. REFRESH your website after running this.

-- 1. FIX USERS TABLE (Changing uid to id to match exactly what the code expects)
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "full_name" TEXT,
    "photo_url" TEXT,
    "phone_number" TEXT,
    "account_number" TEXT,
    "role" TEXT DEFAULT 'user',
    "kyc_status" TEXT DEFAULT 'none',
    "balance" NUMERIC DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist in users
DO $$ 
BEGIN
    BEGIN ALTER TABLE users ADD COLUMN full_name TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE users ADD COLUMN phone_number TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE users ADD COLUMN photo_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE users ADD COLUMN display_name TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- 2. FIX TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    "uid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "amount" NUMERIC DEFAULT 0,
    "currency" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist in transactions
DO $$ 
BEGIN
    BEGIN ALTER TABLE transactions ADD COLUMN method TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN country TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN source_amount NUMERIC; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN source_currency TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN proof_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN transaction_code TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN description TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN rejection_reason TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN admin_proof TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN target_amount NUMERIC; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN target_currency TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN bank_info JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- 3. ENABLE PUBLIC ACCESS FOR TESTING (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Full Access" ON transactions;
CREATE POLICY "Public Full Access" ON transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access" ON users;
CREATE POLICY "Public Full Access" ON users FOR ALL USING (true) WITH CHECK (true);

-- 4. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
