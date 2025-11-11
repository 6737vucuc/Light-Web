-- Update Stories table to match Instagram features
-- Add new columns for Instagram-style stories

-- Add story reactions table
CREATE TABLE IF NOT EXISTS story_reactions (
  id SERIAL PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(50) NOT NULL DEFAULT 'like', -- 'like', 'love', 'laugh', 'wow', 'sad', 'angry'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

-- Add story replies table (DM replies to stories)
CREATE TABLE IF NOT EXISTS story_replies (
  id SERIAL PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  encrypted_content TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add close friends list table
CREATE TABLE IF NOT EXISTS close_friends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Add story highlights table
CREATE TABLE IF NOT EXISTS story_highlights (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  cover_image TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add story highlight items table
CREATE TABLE IF NOT EXISTS story_highlight_items (
  id SERIAL PRIMARY KEY,
  highlight_id INTEGER NOT NULL REFERENCES story_highlights(id) ON DELETE CASCADE,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW()
);

-- Add columns to stories table if they don't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_close_friends BOOLEAN DEFAULT false;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS background_color VARCHAR(20);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS text_content TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS font_style VARCHAR(50);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_url TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_title VARCHAR(255);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS mentions TEXT; -- JSON array of mentioned user IDs
ALTER TABLE stories ADD COLUMN IF NOT EXISTS hashtags TEXT; -- JSON array of hashtags
ALTER TABLE stories ADD COLUMN IF NOT EXISTS stickers TEXT; -- JSON array of sticker data
ALTER TABLE stories ADD COLUMN IF NOT EXISTS poll_data TEXT; -- JSON for poll data
ALTER TABLE stories ADD COLUMN IF NOT EXISTS question_data TEXT; -- JSON for question sticker data
ALTER TABLE stories ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS link_title VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_user_id ON story_views(user_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id ON story_reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_story_id ON story_replies(story_id);
CREATE INDEX IF NOT EXISTS idx_close_friends_user_id ON close_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_story_highlights_user_id ON story_highlights(user_id);
