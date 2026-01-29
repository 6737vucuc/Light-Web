-- Create users table if not exists (mirroring current schema)
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(50) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  avatar TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES public.users(id),
  receiver_id INTEGER REFERENCES public.users(id),
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text',
  media_url TEXT,
  is_encrypted BOOLEAN DEFAULT TRUE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for direct_messages
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- Create calls table for signaling and status
CREATE TABLE IF NOT EXISTS public.calls (
  id SERIAL PRIMARY KEY,
  caller_id INTEGER REFERENCES public.users(id),
  receiver_id INTEGER REFERENCES public.users(id),
  caller_peer_id TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'ringing', -- ringing, connected, rejected, ended
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for calls
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
