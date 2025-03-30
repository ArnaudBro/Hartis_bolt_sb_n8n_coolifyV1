/*
  # Add status column to templates table

  1. Changes
    - Add status column (boolean) to templates table with default TRUE
    - Update existing templates to have status = TRUE
    - Update RLS policies to include status condition
*/

-- Add status column
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT TRUE;

-- Update existing records
UPDATE templates SET status = TRUE WHERE status IS NULL;

-- Make status NOT NULL after setting default value for existing records
ALTER TABLE templates 
ALTER COLUMN status SET NOT NULL;

-- Update RLS policies to include status condition
DROP POLICY IF EXISTS "Users can read own templates" ON templates;
CREATE POLICY "Users can read own templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND status = TRUE);

DROP POLICY IF EXISTS "Users can update own templates" ON templates;
CREATE POLICY "Users can update own templates"
  ON templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = TRUE);