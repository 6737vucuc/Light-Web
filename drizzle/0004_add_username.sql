-- Add username column to users table
ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;

-- Add username_last_changed column to track when username was last modified
ALTER TABLE users ADD COLUMN username_last_changed TIMESTAMP;

-- Create index for faster username lookups
CREATE INDEX idx_users_username ON users(username);

-- Update existing users with default usernames (user_id format)
UPDATE users SET username = CONCAT('user_', id) WHERE username IS NULL;

-- Make username NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
