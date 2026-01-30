-- ============================================
-- Migration: Add Advanced Group Chat Features
-- ============================================

-- Step 1: Add new columns to existing tables
-- ============================================

-- Add pinned messages table
CREATE TABLE IF NOT EXISTS pinned_messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES community_groups(id) ON DELETE CASCADE NOT NULL,
  message_id INTEGER REFERENCES group_messages(id) ON DELETE CASCADE NOT NULL,
  pinned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  pinned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, message_id)
);

-- Add starred messages table (bookmarks)
CREATE TABLE IF NOT EXISTS starred_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message_id INTEGER REFERENCES group_messages(id) ON DELETE CASCADE NOT NULL,
  starred_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- Add mentions table for @mentions
CREATE TABLE IF NOT EXISTS message_mentions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES group_messages(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, mentioned_user_id)
);

-- Add group member roles and permissions
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN DEFAULT false;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS can_delete_messages BOOLEAN DEFAULT false;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP;

-- Add online status tracking table
CREATE TABLE IF NOT EXISTS member_presence (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES community_groups(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP DEFAULT NOW(),
  session_id VARCHAR(255),
  UNIQUE(group_id, user_id, session_id)
);

-- Add group settings table
CREATE TABLE IF NOT EXISTS group_settings (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES community_groups(id) ON DELETE CASCADE NOT NULL UNIQUE,
  allow_members_to_delete BOOLEAN DEFAULT false,
  allow_members_to_edit BOOLEAN DEFAULT false,
  require_approval_for_members BOOLEAN DEFAULT false,
  auto_delete_messages_after_days INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add group activity log table
CREATE TABLE IF NOT EXISTS group_activity_log (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES community_groups(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Add indexes for better performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pinned_messages_group_id ON pinned_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_message_id ON pinned_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_starred_messages_user_id ON starred_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_messages_message_id ON starred_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_message_id ON message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_mentioned_user_id ON message_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_member_presence_group_id ON member_presence(group_id);
CREATE INDEX IF NOT EXISTS idx_member_presence_user_id ON member_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_member_presence_is_online ON member_presence(is_online);
CREATE INDEX IF NOT EXISTS idx_group_activity_log_group_id ON group_activity_log(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_log_created_at ON group_activity_log(created_at);

-- Step 3: Add search capability to messages
-- ============================================

-- Add full-text search index for messages
CREATE INDEX IF NOT EXISTS idx_group_messages_content_search ON group_messages USING GIN(to_tsvector('english', content));

-- Step 4: Add message edit history
-- ============================================

CREATE TABLE IF NOT EXISTS message_edit_history (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES group_messages(id) ON DELETE CASCADE NOT NULL,
  old_content TEXT NOT NULL,
  edited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  edited_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_edit_history_message_id ON message_edit_history(message_id);

-- Step 5: Add message read receipts for groups
-- ============================================

CREATE TABLE IF NOT EXISTS group_message_read_receipts (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES group_messages(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_message_read_receipts_message_id ON group_message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_read_receipts_user_id ON group_message_read_receipts(user_id);

-- ============================================
-- Migration Complete
-- ============================================

-- Summary:
-- ✓ Added: pinned_messages, starred_messages, message_mentions
-- ✓ Added: member_presence for real-time online tracking
-- ✓ Added: group_settings for group configuration
-- ✓ Added: group_activity_log for audit trail
-- ✓ Added: message_edit_history for edit tracking
-- ✓ Added: group_message_read_receipts for read status
-- ✓ Enhanced: group_members with admin/moderator roles
-- ✓ Added: Full-text search capability
-- ✓ Added: Multiple indexes for performance optimization
