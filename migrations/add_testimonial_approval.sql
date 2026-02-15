-- Add approved field to support_tickets for testimonials
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_approved ON support_tickets(approved);
CREATE INDEX IF NOT EXISTS idx_support_tickets_type ON support_tickets(type);
