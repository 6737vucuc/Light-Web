-- Migration: Add isDelivered and deliveredAt fields to messages table
-- Run this in your Neon Console or via psql

-- Add isDelivered column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'is_delivered'
  ) THEN
    ALTER TABLE messages 
    ADD COLUMN is_delivered BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add deliveredAt column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE messages 
    ADD COLUMN delivered_at TIMESTAMP;
  END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages' 
  AND column_name IN ('is_delivered', 'delivered_at')
ORDER BY column_name;
