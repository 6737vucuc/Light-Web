-- Add encryption support to group messages
ALTER TABLE group_messages 
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Create direct messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text',
  media_url TEXT,
  is_encrypted BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_is_read ON direct_messages(is_read) WHERE is_read = false;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_direct_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_direct_messages_updated_at
BEFORE UPDATE ON direct_messages
FOR EACH ROW
EXECUTE FUNCTION update_direct_messages_updated_at();

-- Add online status and last seen to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

COMMENT ON TABLE direct_messages IS 'Stores end-to-end encrypted direct messages between users';
COMMENT ON COLUMN direct_messages.is_encrypted IS 'Indicates if message content is encrypted using military-grade AES-256-GCM';
COMMENT ON COLUMN group_messages.is_encrypted IS 'Indicates if group message content is encrypted using military-grade AES-256-GCM';
