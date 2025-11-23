-- Add lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  religion VARCHAR(50) NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on religion for faster filtering
CREATE INDEX IF NOT EXISTS idx_lessons_religion ON lessons(religion);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);
