-- Safe SQL for Dispute Messages and Rates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dispute_messages') THEN
        CREATE TABLE dispute_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tx_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            sender_role TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Enable RLS and set policy safely
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'dispute_messages' AND policyname = 'Allow all for dispute_messages'
    ) THEN
        CREATE POLICY "Allow all for dispute_messages" ON dispute_messages FOR ALL USING (true);
    END IF;
END $$;

-- Update Rates Table safely
ALTER TABLE rates ADD COLUMN IF NOT EXISTS "effective_date" TEXT;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS "tiered_rates" JSONB DEFAULT '[]'::jsonb;

-- Add admin_proof to transactions if missing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "admin_proof" TEXT;

-- Reload schema
NOTIFY pgrst, 'reload schema';
