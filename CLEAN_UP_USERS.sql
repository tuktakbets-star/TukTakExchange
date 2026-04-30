-- Step 1: Clean up empty strings that cause duplicate unique index failures
-- We set empty strings to NULL to allow the unique constraint to work (multi-NULLs are usually allowed, but multiple '' are not)
UPDATE public.users SET phone_number = NULL WHERE phone_number = '';
UPDATE public.users SET passport_number = NULL WHERE passport_number = '';

-- Step 2: Ensure the columns exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';

-- Step 3: Remove any actual duplicates before applying index (if they exist)
-- This deletes older duplicates keeping only the most recent one for each phone/passport
DELETE FROM public.users a USING public.users b 
WHERE a.id < b.id 
AND a.phone_number = b.phone_number 
AND a.phone_number IS NOT NULL;

DELETE FROM public.users a USING public.users b 
WHERE a.id < b.id 
AND a.passport_number = b.passport_number 
AND a.passport_number IS NOT NULL;

-- Step 4: Apply Unique Constraints properly
DROP INDEX IF EXISTS idx_users_unique_phone;
DROP INDEX IF EXISTS idx_users_unique_passport;

CREATE UNIQUE INDEX idx_users_unique_phone ON public.users(phone_number) WHERE phone_number IS NOT NULL;
CREATE UNIQUE INDEX idx_users_unique_passport ON public.users(passport_number) WHERE passport_number IS NOT NULL;
