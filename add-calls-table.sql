-- Create calls table for video/audio calls
CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  caller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('video', 'audio', 'voice')),
  room_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'ringing' CHECK (status IN ('ringing', 'ongoing', 'ended', 'declined', 'missed')),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_room_id ON calls(room_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at);

-- Add comment
COMMENT ON TABLE calls IS 'Video and audio calls using LiveKit';
