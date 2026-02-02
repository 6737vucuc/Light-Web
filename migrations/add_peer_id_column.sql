-- Migration: Add current_peer_id column to users table
-- This column stores the active PeerJS ID for voice calls

-- Add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'current_peer_id'
    ) THEN
        ALTER TABLE users ADD COLUMN current_peer_id VARCHAR(255) DEFAULT NULL;
        
        -- Add index for faster lookups
        CREATE INDEX idx_users_current_peer_id ON users(current_peer_id);
        
        -- Add comment
        COMMENT ON COLUMN users.current_peer_id IS 'Active PeerJS ID for voice calls, cleared on disconnect';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'current_peer_id';
