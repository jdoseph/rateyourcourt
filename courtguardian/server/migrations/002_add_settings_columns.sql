-- Add notification_settings and privacy_settings columns to users table
ALTER TABLE users 
ADD COLUMN notification_settings JSONB DEFAULT NULL,
ADD COLUMN privacy_settings JSONB DEFAULT NULL;

-- Add index for better performance when querying by settings
CREATE INDEX idx_users_notification_settings ON users USING GIN (notification_settings);
CREATE INDEX idx_users_privacy_settings ON users USING GIN (privacy_settings);