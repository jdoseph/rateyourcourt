-- Migration: Add avatar_colors column to users table
-- Date: 2025-01-15
-- Description: Add JSON column to store user's custom avatar color preferences

-- Add avatar_colors column with default values
ALTER TABLE users 
ADD COLUMN avatar_colors JSON DEFAULT '{"start": "#3498db", "end": "#2c3e50"}';

-- Add comment for documentation
COMMENT ON COLUMN users.avatar_colors IS 'JSON object storing user avatar gradient colors with start and end hex values';

-- Update existing users to have the default avatar colors
UPDATE users 
SET avatar_colors = '{"start": "#3498db", "end": "#2c3e50"}'
WHERE avatar_colors IS NULL;