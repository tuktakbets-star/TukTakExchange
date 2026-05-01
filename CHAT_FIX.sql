-- SQL to set up chat and dispute message tables in Supabase
-- This handles messages, voice, photos, and videos

-- 1. Create chats table (to track chat status for admin)
CREATE TABLE IF NOT EXISTS public.chats (
    uid TEXT PRIMARY KEY,
    user_name TEXT,
    user_email TEXT,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create chat_messages table (for support chat)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES public.chats(uid) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'user',
    text TEXT,
    type TEXT NOT NULL DEFAULT 'text',
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create dispute_messages table (for dispute chat)
CREATE TABLE IF NOT EXISTS public.dispute_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tx_id TEXT NOT NULL, -- References transactions table if it exists
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'user',
    text TEXT,
    type TEXT NOT NULL DEFAULT 'text',
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Realtime using a safe block
DO $$
BEGIN
    -- Enable Realtime for chats
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chats'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
    END IF;

    -- Enable Realtime for chat_messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;

    -- Enable Realtime for dispute_messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'dispute_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_messages;
    END IF;
END $$;

-- 5. Add RLS policies (Allow all for now, user can harden later)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

-- Basic policies - in production, these should be restricted to authenticated users and specific owners
DROP POLICY IF EXISTS "Allow all access to chats" ON public.chats;
CREATE POLICY "Allow all access to chats" ON public.chats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to chat_messages" ON public.chat_messages;
CREATE POLICY "Allow all access to chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to dispute_messages" ON public.dispute_messages;
CREATE POLICY "Allow all access to dispute_messages" ON public.dispute_messages FOR ALL USING (true) WITH CHECK (true);
