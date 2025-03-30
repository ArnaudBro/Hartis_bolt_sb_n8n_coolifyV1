/*
  # Update Rules Table Schema

  1. Changes
    - Remove unnecessary fields
    - Ensure required fields are present and properly constrained
    - Add validation for status field
    - Ensure timestamps are automatically managed

  2. Required Fields
    - id (uuid, primary key)
    - contents (text, not null)
    - status (boolean, not null, default false)
    - created_at (timestamptz, not null, default now())
    - updated_at (timestamptz, not null, default now())
*/

-- First, ensure the trigger function exists for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update the rules table
DO $$ 
BEGIN
    -- Add any missing required columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rules' AND column_name = 'contents'
    ) THEN
        ALTER TABLE rules ADD COLUMN contents text NOT NULL DEFAULT '';
    END IF;

    -- Ensure status is boolean
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rules' AND column_name = 'status'
    ) THEN
        ALTER TABLE rules ALTER COLUMN status SET DATA TYPE boolean USING status::boolean;
        ALTER TABLE rules ALTER COLUMN status SET DEFAULT false;
        ALTER TABLE rules ALTER COLUMN status SET NOT NULL;
    ELSE
        ALTER TABLE rules ADD COLUMN status boolean NOT NULL DEFAULT false;
    END IF;

    -- Ensure timestamp columns exist and are properly configured
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rules' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE rules ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rules' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE rules ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    END IF;

    -- Drop unnecessary columns while keeping required ones
    DO $inner$ 
    DECLARE
        col record;
    BEGIN
        FOR col IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'rules' 
            AND column_name NOT IN ('id', 'contents', 'status', 'created_at', 'updated_at', 'user_id')
        LOOP
            EXECUTE format('ALTER TABLE rules DROP COLUMN IF EXISTS %I', col.column_name);
        END LOOP;
    END $inner$;
END $$;

-- Ensure the updated_at trigger is properly set
DROP TRIGGER IF EXISTS update_rules_updated_at ON rules;
CREATE TRIGGER update_rules_updated_at
    BEFORE UPDATE ON rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update RLS policies
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- Recreate policies with updated fields
DROP POLICY IF EXISTS "Users can insert own rules" ON rules;
CREATE POLICY "Users can insert own rules"
    ON rules
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own rules" ON rules;
CREATE POLICY "Users can read own rules"
    ON rules
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rules" ON rules;
CREATE POLICY "Users can update own rules"
    ON rules
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);