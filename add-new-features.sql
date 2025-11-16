-- Add banned_reason column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_reason TEXT;

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id),
  reported_user_id INTEGER NOT NULL REFERENCES users(id),
  message_id INTEGER REFERENCES group_messages(id),
  group_id INTEGER REFERENCES community_groups(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'normal',
  assigned_to INTEGER REFERENCES users(id),
  admin_response TEXT,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create support_replies table
CREATE TABLE IF NOT EXISTS support_replies (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create daily_verses table
CREATE TABLE IF NOT EXISTS daily_verses (
  id SERIAL PRIMARY KEY,
  verse_text TEXT NOT NULL,
  verse_reference VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'ar',
  religion VARCHAR(50) NOT NULL,
  display_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create lesson_progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  lesson_id VARCHAR(100) NOT NULL,
  lesson_title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_verses_date ON daily_verses(display_date);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON lesson_progress(user_id);

-- Insert some default daily verses
INSERT INTO daily_verses (verse_text, verse_reference, language, religion, display_date, is_active)
VALUES 
  ('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 'القرآن الكريم - سورة الفاتحة', 'ar', 'islam', CURRENT_DATE, true),
  ('اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ', 'القرآن الكريم - سورة البقرة: 255', 'ar', 'islam', CURRENT_DATE + INTERVAL '1 day', true)
ON CONFLICT DO NOTHING;
