/*
  # Fix RLS policies for templates table

  1. Changes
    - Drop existing policies
    - Create new simplified policies that properly handle all operations
    - Ensure proper status handling for soft deletes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own templates" ON templates;
DROP POLICY IF EXISTS "Users can read own templates" ON templates;
DROP POLICY IF EXISTS "Users can update own templates" ON templates;

-- Create new simplified policies
CREATE POLICY "Users can insert own templates"
  ON templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);