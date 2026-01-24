-- Migration: Add VPN Detection Logs Table
-- Date: 2026-01-24
-- Description: Create table for tracking VPN, Tor, Proxy, and suspicious connections

CREATE TABLE IF NOT EXISTS vpn_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ip_address VARCHAR(45) NOT NULL,
  country VARCHAR(100),
  country_code VARCHAR(2),
  city VARCHAR(100),
  region VARCHAR(100),
  isp VARCHAR(255),
  organization VARCHAR(255),
  asn VARCHAR(50),
  -- Detection flags
  is_vpn BOOLEAN DEFAULT FALSE,
  is_tor BOOLEAN DEFAULT FALSE,
  is_proxy BOOLEAN DEFAULT FALSE,
  is_hosting BOOLEAN DEFAULT FALSE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  -- Risk assessment
  risk_score INTEGER DEFAULT 0,
  threat_level VARCHAR(20) DEFAULT 'low',
  -- Detection service
  detection_service VARCHAR(50),
  detection_data TEXT,
  -- Action taken
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  -- Request details
  user_agent TEXT,
  request_path VARCHAR(255),
  request_method VARCHAR(10),
  -- Timestamps
  detected_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vpn_logs_user_id ON vpn_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_ip_address ON vpn_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_is_vpn ON vpn_logs(is_vpn);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_is_tor ON vpn_logs(is_tor);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_is_blocked ON vpn_logs(is_blocked);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_detected_at ON vpn_logs(detected_at);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_threat_level ON vpn_logs(threat_level);

-- Add comment
COMMENT ON TABLE vpn_logs IS 'Logs for VPN, Tor, Proxy, and suspicious connection detection';
