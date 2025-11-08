-- Add delivery status columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Update existing messages to mark them as delivered if they are read
UPDATE messages 
SET is_delivered = true, 
    delivered_at = read_at 
WHERE is_read = true AND is_delivered = false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_delivered ON messages(is_delivered);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_delivered ON messages(receiver_id, is_delivered);
