-- Create trusted_devices table
CREATE TABLE IF NOT EXISTS trusted_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(45),
    last_used TIMESTAMP DEFAULT NOW(),
    is_trusted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create internal_2fa_codes table
CREATE TABLE IF NOT EXISTS internal_2fa_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_device_id ON trusted_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_internal_2fa_codes_user_id ON internal_2fa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_2fa_codes_code ON internal_2fa_codes(code);
