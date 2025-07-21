-- Add updated_at column to the folders table
ALTER TABLE folders
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Optionally, if you want to set existing rows' updated_at to their created_at
-- UPDATE folders SET updated_at = created_at WHERE updated_at IS NULL;
