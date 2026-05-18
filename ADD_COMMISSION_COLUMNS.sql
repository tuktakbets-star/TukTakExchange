-- ADD MISSING COLUMNS FOR COMMISSIONS AND ASSIGNMENTS
-- This script adds the missing columns required for operator commissions and assignments.

DO $$ 
BEGIN
    -- Assigned Sub-Admin (Operator)
    BEGIN 
        ALTER TABLE transactions ADD COLUMN assigned_sub_admin_id TEXT; 
    EXCEPTION WHEN duplicate_column THEN NULL; 
    END;

    -- Commission Amount
    BEGIN 
        ALTER TABLE transactions ADD COLUMN commission_amount NUMERIC DEFAULT 0; 
    EXCEPTION WHEN duplicate_column THEN NULL; 
    END;

    -- Commission Processed Flag
    BEGIN 
        ALTER TABLE transactions ADD COLUMN commission_processed BOOLEAN DEFAULT false; 
    EXCEPTION WHEN duplicate_column THEN NULL; 
    END;

    -- Recharge Details
    BEGIN 
        ALTER TABLE transactions ADD COLUMN recharge_details JSONB; 
    EXCEPTION WHEN duplicate_column THEN NULL; 
    END;

    -- Claim Time
    BEGIN 
        ALTER TABLE transactions ADD COLUMN claim_time TIMESTAMP WITH TIME ZONE; 
    EXCEPTION WHEN duplicate_column THEN NULL; 
    END;

    -- Paid at Time
    BEGIN 
        ALTER TABLE transactions ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE; 
    EXCEPTION WHEN duplicate_column THEN NULL; 
    END;

    -- Sub Admin Actions
    BEGIN 
        ALTER TABLE transactions ADD COLUMN sub_admin_action TEXT; 
    EXCEPTION WHEN duplicate_column THEN NULL; 
    END;

    BEGIN 
        ALTER TABLE transactions ADD COLUMN sub_admin_actioned_at TIMESTAMP WITH TIME ZONE; 
    EXCEPTION WHEN duplicate_column THEN NULL; 
    END;

END $$;

-- Update RLS for sub_admins table just in case
ALTER TABLE sub_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select sub_admins" ON sub_admins;
CREATE POLICY "Public select sub_admins" ON sub_admins FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public update sub_admins" ON sub_admins;
CREATE POLICY "Public update sub_admins" ON sub_admins FOR UPDATE USING (true);

-- Ensure transactions and sub_admins are in realtime
DO $$ 
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sub_admins; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE transactions; EXCEPTION WHEN others THEN NULL; END;
END $$;
