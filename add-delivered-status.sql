-- Add delivered status fields to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Update existing messages to mark as delivered if they are read
UPDATE messages 
SET is_delivered = TRUE, delivered_at = read_at 
WHERE is_read = TRUE AND is_delivered IS NULL;
