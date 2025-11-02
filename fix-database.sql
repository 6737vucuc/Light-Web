-- Fix Database Schema
-- This script adds all missing tables and columns

-- ============================================
-- 1. Add missing columns to users table
-- ============================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS username_last_changed TIMESTAMP,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_followers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_following BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_comments VARCHAR(20) DEFAULT 'everyone',
ADD COLUMN IF NOT EXISTS allow_messages VARCHAR(20) DEFAULT 'everyone';

-- Update existing users to have username based on email
UPDATE users 
SET username = LOWER(SPLIT_PART(email, '@', 1)) 
WHERE username IS NULL;

-- ============================================
-- 2. Add missing columns to messages table
-- ============================================

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS conversation_id INTEGER,
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS post_id INTEGER,
ADD COLUMN IF NOT EXISTS reply_to_id INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================
-- 3. Create missing tables
-- ============================================

-- comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment_id INTEGER NOT NULL REFERENCES comments(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- follows table
CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id),
  following_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'accepted',
  created_at TIMESTAMP DEFAULT NOW()
);

-- story_views table
CREATE TABLE IF NOT EXISTS story_views (
  id SERIAL PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  viewed_at TIMESTAMP DEFAULT NOW()
);

-- conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  participant1_id INTEGER NOT NULL REFERENCES users(id),
  participant2_id INTEGER NOT NULL REFERENCES users(id),
  last_message_id INTEGER,
  last_message_at TIMESTAMP DEFAULT NOW(),
  is_pinned_1 BOOLEAN DEFAULT false,
  is_pinned_2 BOOLEAN DEFAULT false,
  is_muted_1 BOOLEAN DEFAULT false,
  is_muted_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  reaction VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- typing_indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  is_typing BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  from_user_id INTEGER NOT NULL REFERENCES users(id),
  post_id INTEGER REFERENCES posts(id),
  comment_id INTEGER REFERENCES comments(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  blocked_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- saved_posts table
CREATE TABLE IF NOT EXISTS saved_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  post_id INTEGER NOT NULL REFERENCES posts(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- post_tags table
CREATE TABLE IF NOT EXISTS post_tags (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- group_chats table
CREATE TABLE IF NOT EXISTS group_chats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar TEXT,
  cover_photo TEXT,
  privacy VARCHAR(20) DEFAULT 'public',
  members_count INTEGER DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- group_chat_members table
CREATE TABLE IF NOT EXISTS group_chat_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES group_chats(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW()
);

-- group_chat_messages table
CREATE TABLE IF NOT EXISTS group_chat_messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES group_chats(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT,
  encrypted_content TEXT,
  media_url TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- lesson_progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  lesson_id INTEGER NOT NULL REFERENCES lessons(id),
  completed BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- user_privacy_settings table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  privacy_posts VARCHAR(20) DEFAULT 'everyone',
  privacy_friends_list VARCHAR(20) DEFAULT 'everyone',
  privacy_profile VARCHAR(20) DEFAULT 'everyone',
  privacy_photos VARCHAR(20) DEFAULT 'everyone',
  privacy_messages VARCHAR(20) DEFAULT 'everyone',
  privacy_friend_requests VARCHAR(20) DEFAULT 'everyone',
  hide_online_status BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. Create indexes for better performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_members_group_id ON group_chat_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_members_user_id ON group_chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_group_id ON group_chat_messages(group_id);

-- ============================================
-- Done!
-- ============================================
