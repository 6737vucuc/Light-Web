-- Migration: Add vpnLogs, groupMessagePinned tables and update testimonies table

-- 1. Add new columns to testimonies table
ALTER TABLE testimonies 
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Create vpn_logs table
CREATE TABLE IF NOT EXISTS vpn_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ip_address VARCHAR(45) NOT NULL,
  country VARCHAR(100),
  country_code VARCHAR(10),
  city VARCHAR(100),
  region VARCHAR(100),
  isp VARCHAR(255),
  organization VARCHAR(255),
  asn VARCHAR(50),
  is_vpn BOOLEAN DEFAULT FALSE,
  is_tor BOOLEAN DEFAULT FALSE,
  is_proxy BOOLEAN DEFAULT FALSE,
  is_hosting BOOLEAN DEFAULT FALSE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  risk_score INTEGER DEFAULT 0,
  threat_level VARCHAR(20) DEFAULT 'low',
  detection_service VARCHAR(50),
  detection_data TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  user_agent TEXT,
  request_path VARCHAR(500),
  request_method VARCHAR(10),
  detected_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create group_message_pinned table
CREATE TABLE IF NOT EXISTS group_message_pinned (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES community_groups(id) NOT NULL,
  message_id INTEGER REFERENCES group_messages(id) NOT NULL,
  pinned_by INTEGER REFERENCES users(id),
  pinned_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vpn_logs_user_id ON vpn_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_ip_address ON vpn_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_detected_at ON vpn_logs(detected_at);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_is_blocked ON vpn_logs(is_blocked);
CREATE INDEX IF NOT EXISTS idx_group_message_pinned_group_id ON group_message_pinned(group_id);
CREATE INDEX IF NOT EXISTS idx_group_message_pinned_message_id ON group_message_pinned(message_id);
