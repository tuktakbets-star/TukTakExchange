-- THE ULTIMATE STABILITY FIX
-- Run this in Supabase SQL Editor to enforce uniqueness and fix KYC/Profile issues

-- 1. Ensure all required columns exist in the users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_data JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS passport_image TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS selfie_image TEXT;

-- 2. Clean up corrupted data
-- Convert empty strings to NULL so they don't block unique index creation
UPDATE public.users SET phone_number = NULL WHERE phone_number = '' OR phone_number = 'undefined' OR phone_number = 'null';
UPDATE public.users SET passport_number = NULL WHERE passport_number = '' OR passport_number = 'undefined' OR passport_number = 'null';
UPDATE public.users SET email = LOWER(TRIM(email));

-- 3. Sync account_number with phone_number for existing users if missing
UPDATE public.users SET account_number = phone_number WHERE account_number IS NULL AND phone_number IS NOT NULL;

-- 4. Create separate tables for KYC tracking if they don't exist
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    uid TEXT REFERENCES public.users(uid) ON DELETE CASCADE,
    user_email TEXT,
    user_name TEXT,
    passport_url TEXT,
    selfie_url TEXT,
    status TEXT DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Set up RLS for the new table
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public manage kyc_submissions" ON public.kyc_submissions FOR ALL USING (true);

-- 6. Enforce Uniqueness with filtered indices
-- This prevents duplicates for REAL values but allows multiple NULLs
DROP INDEX IF EXISTS idx_users_unique_phone;
DROP INDEX IF EXISTS idx_users_unique_passport;
DROP INDEX IF EXISTS idx_users_email_unique;

CREATE UNIQUE INDEX idx_users_unique_phone ON public.users(phone_number) WHERE phone_number IS NOT NULL AND phone_number != '';
CREATE UNIQUE INDEX idx_users_unique_passport ON public.users(passport_number) WHERE passport_number IS NOT NULL AND passport_number != '';
-- Email should already be unique but just in case
-- CREATE UNIQUE INDEX idx_users_email_unique ON public.users(email);

-- 7. Ensure real-time is enabled for the new table
DO $$ 
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE kyc_submissions;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
