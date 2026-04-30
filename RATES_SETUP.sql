-- RATES TABLE SETUP
-- ১. এই কোডটি কপি করে Supabase SQL Editor এ রান করুন।
-- ২. এটি এক্সচেঞ্জ রেট সেভ করার জন্য টেবিল তৈরি করবে।

CREATE TABLE IF NOT EXISTS "rates" (
    "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    "base" TEXT DEFAULT 'VND',
    "target" TEXT NOT NULL,
    "rate" NUMERIC DEFAULT 1,
    "tiered_rates" JSONB DEFAULT '[]'::jsonb,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS অফ করা যাতে এডমিন সেভ করতে পারে (ডেভলপমেন্টের জন্য)
ALTER TABLE rates DISABLE ROW LEVEL SECURITY;

-- স্যাম্পল ডাটা (অপশনাল)
-- INSERT INTO rates (target, tiered_rates) VALUES ('BDT', '[{"min": 0, "max": 1000000, "rate": 200}]'::jsonb) ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
