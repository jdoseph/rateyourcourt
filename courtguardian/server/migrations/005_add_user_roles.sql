-- Migration: Add user roles support
-- This adds role-based access control to the users table

-- Add role column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Add check constraint for valid roles
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('user', 'admin', 'moderator'));

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Set first user as admin if exists (for development)
UPDATE users SET role = 'admin' WHERE id = 1;

-- Insert comments
COMMENT ON COLUMN users.role IS 'User role: user (default), admin (full access), moderator (limited admin)';