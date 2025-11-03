-- Fix group_chat_messages table
-- Add missing columns to match schema.ts

-- Add message_type column if it doesn't exist
ALTER TABLE group_chat_messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';

-- Add user_id column if it doesn't exist (for compatibility)
-- Note: This is an alias for sender_id
ALTER TABLE group_chat_messages 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Update user_id to match sender_id for existing records
UPDATE group_chat_messages 
SET user_id = sender_id 
WHERE user_id IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'group_chat_messages'
ORDER BY ordinal_position;
