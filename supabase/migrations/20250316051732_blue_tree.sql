/*
  # Rename example_reports table to templates

  1. Changes
    - Rename table from example_reports to templates
    - Update foreign key constraints
    - Update RLS policies
*/

DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'example_reports'
  ) THEN
    ALTER TABLE example_reports RENAME TO templates;
    
    -- Update RLS policies
    ALTER POLICY "Users can insert own example reports" 
    ON templates 
    RENAME TO "Users can insert own templates";
    
    ALTER POLICY "Users can read own example reports" 
    ON templates 
    RENAME TO "Users can read own templates";
    
    ALTER POLICY "Users can update own example reports" 
    ON templates 
    RENAME TO "Users can update own templates";
  END IF;
END $$;