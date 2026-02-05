-- Migration: Update users table for Google OAuth
-- Description: Adds necessary columns to the existing users table to support social login

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'credentials',
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS oauth_data JSONB;

-- Add comments for clarity
COMMENT ON COLUMN users.google_id IS 'Unique ID from Google OAuth';
COMMENT ON COLUMN users.auth_provider IS 'Method used for authentication (credentials, google)';
COMMENT ON COLUMN users.email_verified_at IS 'Timestamp when the email was verified via OAuth';
COMMENT ON COLUMN users.oauth_data IS 'Additional metadata returned from OAuth provider';

-- Update existing users to have 'credentials' as default provider if not set
UPDATE users SET auth_provider = 'credentials' WHERE auth_provider IS NULL;
