-- RUN THIS IN SUPABASE SQL EDITOR
-- TO FIX SUB-ADMIN COMMISSIONS AND SERVICES SAVING

ALTER TABLE IF EXISTS public.sub_admins 
ADD COLUMN IF NOT EXISTS service_commissions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS allowed_services JSONB DEFAULT '["add_money", "cash_in", "exchange", "withdraw", "recharge"]'::jsonb;

-- Ensure RLS allows updates
DROP POLICY IF EXISTS "Public Update SubAdmins" ON public.sub_admins;
CREATE POLICY "Public Update SubAdmins" ON public.sub_admins FOR UPDATE USING (true) WITH CHECK (true);

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
