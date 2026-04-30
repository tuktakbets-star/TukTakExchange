-- ULTIMATE DATABASE FIX
-- ১. এই কোডটি সম্পূর্ণ কপি করুন।
-- ২. Supabase Dashboard -> SQL Editor এ যান।
-- ৩. "New Query" এ ক্লিক করে কোডটি পেস্ট করুন এবং "Run" বাটনে ক্লিক করুন।
-- ৪. এরপর ওয়েবসাইট একবার রিফ্রেশ করুন।

-- users টেবিল আপডেট
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

-- কলামগুলো নিশ্চিত করা (যদি আগে থেকে না থাকে)
DO $$ 
BEGIN
    BEGIN ALTER TABLE users ADD COLUMN IF NOT EXISTS "photo_url" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE users ADD COLUMN IF NOT EXISTS "phone_number" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE users ADD COLUMN IF NOT EXISTS "display_name" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE users ADD COLUMN IF NOT EXISTS "full_name" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE users ADD COLUMN IF NOT EXISTS "account_number" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE users ADD COLUMN IF NOT EXISTS "kyc_status" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE users ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'user'; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- transactions টেবিল আপডেট
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    "uid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "amount" NUMERIC DEFAULT 0,
    "currency" TEXT NOT NULL,
    "method" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- কলামগুলো নিশ্চিত করা
DO $$ 
BEGIN
    BEGIN ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "method" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "country" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "transaction_code" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "proof_url" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "source_amount" NUMERIC; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- পারমিশন ঠিক করা (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All Users" ON users;
CREATE POLICY "Allow All Users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Transactions" ON transactions;
CREATE POLICY "Allow All Transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- ক্যাশ ক্লিয়ার করা
NOTIFY pgrst, 'reload schema';
