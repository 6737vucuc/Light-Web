-- Add Two-Factor Authentication fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_method VARCHAR(20) DEFAULT 'authenticator';
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_verified_at TIMESTAMP;

-- Add index for faster 2FA lookups
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled);
