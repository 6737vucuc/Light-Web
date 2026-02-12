-- Create security_logs table
CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    event VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    location VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add columns to trusted_devices for better tracking
ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS last_ip VARCHAR(45);
ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Add index for security logs
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON security_logs(event);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
