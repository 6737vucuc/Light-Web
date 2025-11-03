-- Create typing_status table for real-time typing indicators
CREATE TABLE IF NOT EXISTS typing_status (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, receiver_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_typing_status_receiver 
ON typing_status(receiver_id, updated_at);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_typing_status_updated 
ON typing_status(updated_at);

-- Add comment
COMMENT ON TABLE typing_status IS 'Stores real-time typing indicators for private messages';
