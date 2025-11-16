-- ============================================
-- Migration: Remove Old Community Features
-- Replace with Group Chat System
-- ============================================

-- Step 1: Drop old tables (in correct order due to foreign keys)
-- ============================================

-- Drop story-related tables
DROP TABLE IF EXISTS story_highlight_items CASCADE;
DROP TABLE IF EXISTS story_highlights CASCADE;
DROP TABLE IF EXISTS story_replies CASCADE;
DROP TABLE IF EXISTS story_reactions CASCADE;
DROP TABLE IF EXISTS story_views CASCADE;
DROP TABLE IF EXISTS close_friends CASCADE;
DROP TABLE IF EXISTS stories CASCADE;

-- Drop post-related tables
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS saved_posts CASCADE;
DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- Drop friendship table (if exists)
DROP TABLE IF EXISTS friendships CASCADE;

-- Step 2: Create new group chat tables
-- ============================================

-- Community Groups table
CREATE TABLE IF NOT EXISTS community_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar TEXT,
  cover_image TEXT,
  color VARCHAR(20) DEFAULT '#8B5CF6',
  icon VARCHAR(50) DEFAULT 'users',
  members_count INTEGER DEFAULT 0,
  messages_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Group Members table
CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES community_groups(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Group Messages table
CREATE TABLE IF NOT EXISTS group_messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES community_groups(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text',
  media_url TEXT,
  reply_to_id INTEGER,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  reactions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Message Reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES group_messages(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reaction VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Step 3: Create indexes for better performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);

-- Step 4: Update users table (remove posts_count if exists)
-- ============================================

ALTER TABLE users DROP COLUMN IF EXISTS posts_count CASCADE;

-- Step 5: Insert sample groups (optional)
-- ============================================

-- You can add default groups here if needed
-- INSERT INTO community_groups (name, description, color, icon, created_by)
-- VALUES ('General Chat', 'Main community group for everyone', '#8B5CF6', 'users', 1);

-- ============================================
-- Migration Complete
-- ============================================

-- Summary:
-- ✓ Removed: posts, stories, comments, likes, and related tables
-- ✓ Created: community_groups, group_members, group_messages, message_reactions
-- ✓ Added: indexes for performance
-- ✓ Kept: users, messages (private), conversations, follows, notifications, admin tables
