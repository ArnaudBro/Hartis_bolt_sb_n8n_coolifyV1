/*
  # Fix RLS policies for templates table

  1. Changes
    - Drop existing policies
    - Create new comprehensive policies for all operations
    - Ensure all policies handle the status column correctly
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own templates" ON templates;
DROP POLICY IF EXISTS "Users can read own templates" ON templates;
DROP POLICY IF EXISTS "Users can update own templates" ON templates;

-- Create new policies
CREATE POLICY "Users can insert own templates"
  ON templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = true
  );

CREATE POLICY "Users can read own templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND status = true
  );

CREATE POLICY "Users can update own templates"
  ON templates
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND status = true
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = true
  );

CREATE POLICY "Users can soft delete own templates"
  ON templates
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND status = true
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = false
  );