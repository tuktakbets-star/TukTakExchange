-- Fix KYC tables and columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_data JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'none';

CREATE TABLE IF NOT EXISTS public.kyc_submissions (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    uid TEXT REFERENCES public.users(uid) ON DELETE CASCADE,
    user_email TEXT,
    user_name TEXT,
    passport_number TEXT,
    passport_url TEXT,
    selfie_url TEXT,
    status TEXT DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure RLS is enabled and public manage is allowed for now
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public manage kyc_submissions" ON public.kyc_submissions;
CREATE POLICY "Public manage kyc_submissions" ON public.kyc_submissions FOR ALL USING (true);

-- Ensure realtime is enabled
DO $$ 
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE kyc_submissions;
    EXCEPTION WHEN others THEN
        NULL;
    END;
END $$;
