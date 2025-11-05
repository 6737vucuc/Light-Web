-- Create VPN Logs table
CREATE TABLE IF NOT EXISTS vpn_logs (
  id SERIAL PRIMARY KEY,
  ip VARCHAR(50) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  email VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  is_vpn BOOLEAN DEFAULT FALSE,
  is_proxy BOOLEAN DEFAULT FALSE,
  is_tor BOOLEAN DEFAULT FALSE,
  is_hosting BOOLEAN DEFAULT FALSE,
  connection_type VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  org TEXT,
  service VARCHAR(100),
  was_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vpn_logs_created_at ON vpn_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_ip ON vpn_logs(ip);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_was_blocked ON vpn_logs(was_blocked);
CREATE INDEX IF NOT EXISTS idx_vpn_logs_service ON vpn_logs(service);
