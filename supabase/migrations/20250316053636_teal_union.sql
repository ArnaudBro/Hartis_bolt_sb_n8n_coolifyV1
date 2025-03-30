/*
  # Add index on status column

  1. Changes
    - Add index on status column to improve query performance
    - Add composite index on user_id and status for common queries
*/

-- Add index on status column
CREATE INDEX IF NOT EXISTS idx_templates_status 
ON templates(status);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_templates_user_status 
ON templates(user_id, status);