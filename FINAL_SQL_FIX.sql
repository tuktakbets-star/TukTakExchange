-- FINAL TOTAL DATABASE FIX
-- ১. এই কোডটি কপি করে Supabase SQL Editor এ রান করুন।
-- এটি rates এবং transactions টেবিল দুটিকেই ঠিক করবে।

-- ----------------------------------------------------
-- ১. RATES TABLE FIX
-- ----------------------------------------------------
DROP TABLE IF EXISTS rates;
CREATE TABLE rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base TEXT DEFAULT 'VND',
    target TEXT NOT NULL,
    rate NUMERIC DEFAULT 1,
    tiered_rates JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE rates DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- ২. TRANSACTIONS TABLE FIX (Add missing fee column)
-- ----------------------------------------------------
-- যদি transactions টেবিল না থাকে তবে তৈরি করবে, থাকলে কলাম এড করবে।
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'transactions') THEN
        CREATE TABLE transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            uid TEXT NOT NULL,
            type TEXT NOT NULL, -- 'exchange', 'deposit', 'withdrawal'
            status TEXT DEFAULT 'pending',
            amount NUMERIC DEFAULT 0,
            currency TEXT DEFAULT 'VND',
            target_amount NUMERIC DEFAULT 0,
            target_currency TEXT,
            target_country TEXT,
            fee NUMERIC DEFAULT 0,
            total_to_deduct NUMERIC DEFAULT 0,
            receiver_info JSONB DEFAULT '{}'::jsonb,
            description TEXT,
            admin_proof TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- কলামগুলো চেক করে এড করা
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='transactions' AND column_name='fee') THEN
            ALTER TABLE transactions ADD COLUMN fee NUMERIC DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='transactions' AND column_name='target_amount') THEN
            ALTER TABLE transactions ADD COLUMN target_amount NUMERIC DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='transactions' AND column_name='total_to_deduct') THEN
            ALTER TABLE transactions ADD COLUMN total_to_deduct NUMERIC DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='transactions' AND column_name='receiver_info') THEN
            ALTER TABLE transactions ADD COLUMN receiver_info JSONB DEFAULT '{}'::jsonb;
        END IF;
    END IF;
END $$;

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- স্যাম্পল ডাটা (VND TO BDT)
INSERT INTO rates (target, rate, tiered_rates) 
VALUES ('BDT', 200, '[{"min": 0, "max": 1000000, "rate": 200}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
