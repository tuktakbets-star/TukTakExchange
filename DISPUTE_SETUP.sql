-- DISPUTE MESSAGES TABLE
CREATE TABLE IF NOT EXISTS dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and set policies
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for dispute_messages" ON dispute_messages FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';
