-- Session Management and Login Requests
-- This script adds session tracking to users and a table for permission requests.

-- Add session fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create login_requests table
CREATE TABLE IF NOT EXISTS login_requests (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  uid TEXT NOT NULL,
  email TEXT NOT NULL,
  device_info JSONB,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, expired
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for login_requests
ALTER TABLE login_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own requests" ON login_requests;
CREATE POLICY "Users can view their own requests" ON login_requests
  FOR SELECT USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "Users can insert their own requests" ON login_requests;
CREATE POLICY "Users can insert their own requests" ON login_requests
  FOR INSERT WITH CHECK (true); -- Allow anonymous check if needed, but here we usually have email

DROP POLICY IF EXISTS "Users can update their own requests" ON login_requests;
CREATE POLICY "Users can update their own requests" ON login_requests
  FOR UPDATE USING (auth.uid()::text = uid) WITH CHECK (auth.uid()::text = uid);

-- Realtime for login_requests
DO $$ 
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE login_requests;
    EXCEPTION WHEN others THEN
        NULL;
    END;
END $$;
