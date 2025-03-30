/*
  # Fix Template RLS Policies

  1. Changes
    - Drop existing policies
    - Create new policies with proper status handling
    - Ensure policies cover all necessary operations
    - Fix policy conditions for soft delete

  2. Security
    - Maintain user isolation
    - Properly handle status field in all policies
    - Ensure soft delete works correctly
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own templates" ON templates;
DROP POLICY IF EXISTS "Users can read own templates" ON templates;
DROP POLICY IF EXISTS "Users can update own templates" ON templates;
DROP POLICY IF EXISTS "Users can soft delete own templates" ON templates;

-- Create new policies with proper conditions
CREATE POLICY "Users can insert own templates"
  ON templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
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
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Note: We don't need a separate soft delete policy as it's covered by the update policy