-- FORCE RATES TABLE FIX
-- ১. এই কোডটি কপি করে Supabase SQL Editor এ রান করুন।
-- ২. এটি আগের টেবিল মুছে নতুন করে তৈরি করবে যাতে কোনো RLS বা কলামের সমস্যা না থাকে।
-- ৩. সতর্কতা: এটি আগের এক্সচেঞ্জ রেট মুছে দেবে।

DROP TABLE IF EXISTS rates;

CREATE TABLE rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base TEXT DEFAULT 'VND',
    target TEXT NOT NULL,
    rate NUMERIC DEFAULT 1,
    tiered_rates JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS অফ করা যাতে সবাই অ্যাক্সেস পায় (অ্যাডমিন সহ)
ALTER TABLE rates DISABLE ROW LEVEL SECURITY;

-- স্যাম্পল ডাটা (VND TO BDT)
INSERT INTO rates (target, rate, tiered_rates) 
VALUES ('BDT', 200, '[{"min": 0, "max": 1000000, "rate": 200}]'::jsonb);

INSERT INTO rates (target, rate, tiered_rates) 
VALUES ('INR', 300, '[{"min": 0, "max": 1000000, "rate": 300}]'::jsonb);

INSERT INTO rates (target, rate, tiered_rates) 
VALUES ('PKR', 100, '[{"min": 0, "max": 1000000, "rate": 100}]'::jsonb);

INSERT INTO rates (target, rate, tiered_rates) 
VALUES ('NPR', 180, '[{"min": 0, "max": 1000000, "rate": 180}]'::jsonb);

-- ক্যাশ ক্লিয়ার
NOTIFY pgrst, 'reload schema';
