-- Final Robust Setup Script
-- Copy and run this in the Supabase SQL Editor as a SINGLE block.

DO $$ 
BEGIN
    -- 1. Create or Update 'rates' table
    CREATE TABLE IF NOT EXISTS public.rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        base TEXT DEFAULT 'VND',
        target TEXT NOT NULL,
        rate NUMERIC NOT NULL DEFAULT 1,
        effective_date TEXT,
        tiered_rates JSONB DEFAULT '[]'::jsonb,
        account_types JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(target)
    );

    -- Add missing columns to rates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rates' AND column_name = 'account_types') THEN
        ALTER TABLE public.rates ADD COLUMN account_types JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rates' AND column_name = 'tiered_rates') THEN
        ALTER TABLE public.rates ADD COLUMN tiered_rates JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- 2. Create or Update 'admin_settings' table
    CREATE TABLE IF NOT EXISTS public.admin_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    IF NOT EXISTS (SELECT 1 FROM public.admin_settings WHERE key = 'global_settings') THEN
        INSERT INTO public.admin_settings (key, value) VALUES ('global_settings', '{"rates": {}}'::jsonb);
    END IF;

    -- 3. Update 'transactions' table (Adding all missing columns for Cash In and Recharge)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        CREATE TABLE public.transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            uid UUID,
            type TEXT,
            amount NUMERIC,
            currency TEXT DEFAULT 'VND',
            status TEXT DEFAULT 'pending',
            method TEXT,
            source_amount NUMERIC,
            source_currency TEXT,
            country TEXT,
            proof_url TEXT,
            transaction_code TEXT,
            recharge_details JSONB,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
    ELSE
        -- Table exists, add missing columns one by one
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'country') THEN
            ALTER TABLE public.transactions ADD COLUMN country TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'method') THEN
            ALTER TABLE public.transactions ADD COLUMN method TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'source_amount') THEN
            ALTER TABLE public.transactions ADD COLUMN source_amount NUMERIC;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'source_currency') THEN
            ALTER TABLE public.transactions ADD COLUMN source_currency TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'proof_url') THEN
            ALTER TABLE public.transactions ADD COLUMN proof_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'transaction_code') THEN
            ALTER TABLE public.transactions ADD COLUMN transaction_code TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'recharge_details') THEN
            ALTER TABLE public.transactions ADD COLUMN recharge_details JSONB;
        END IF;
    END IF;

    -- 4. Create or Update 'dispute_messages' table
    CREATE TABLE IF NOT EXISTS public.dispute_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tx_id UUID,
        sender_id UUID,
        sender_name TEXT,
        sender_role TEXT DEFAULT 'user',
        text TEXT,
        type TEXT DEFAULT 'text',
        url TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- 5. Realtime Setup
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rates') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.rates;
            END IF;
        EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping rates publication'; END;

        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'admin_settings') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
            END IF;
        EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping admin_settings publication'; END;

        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dispute_messages') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_messages;
            END IF;
        EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping dispute_messages publication'; END;
    END IF;

    -- 6. RLS Policies
    EXECUTE 'ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY';

    -- Drop and Recreate Policies to ensure they are correct
    DROP POLICY IF EXISTS "Public Read Rates" ON public.rates;
    CREATE POLICY "Public Read Rates" ON public.rates FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admin All Rates" ON public.rates;
    CREATE POLICY "Admin All Rates" ON public.rates FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public Read Settings" ON public.admin_settings;
    CREATE POLICY "Public Read Settings" ON public.admin_settings FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admin All Settings" ON public.admin_settings;
    CREATE POLICY "Admin All Settings" ON public.admin_settings FOR ALL USING (true);

    DROP POLICY IF EXISTS "Anyone can insert transactions" ON public.transactions;
    CREATE POLICY "Anyone can insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Anyone can read transactions" ON public.transactions;
    CREATE POLICY "Anyone can read transactions" ON public.transactions FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Anyone can update transactions" ON public.transactions;
    CREATE POLICY "Anyone can update transactions" ON public.transactions FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Anyone can read dispute messages" ON public.dispute_messages;
    CREATE POLICY "Anyone can read dispute messages" ON public.dispute_messages FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Anyone can insert dispute messages" ON public.dispute_messages;
    CREATE POLICY "Anyone can insert dispute messages" ON public.dispute_messages FOR INSERT WITH CHECK (true);

END $$;
