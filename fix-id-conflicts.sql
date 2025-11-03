-- Fix ID Conflicts and Sync Sequences
-- This script fixes ID sequence conflicts by syncing all sequences with their current max IDs

-- ============================================
-- Sync all sequences with their max IDs
-- ============================================

-- Users table
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);

-- Posts table
SELECT setval('posts_id_seq', COALESCE((SELECT MAX(id) FROM posts), 1), true);

-- Comments table
SELECT setval('comments_id_seq', COALESCE((SELECT MAX(id) FROM comments), 1), true);

-- Likes table
SELECT setval('likes_id_seq', COALESCE((SELECT MAX(id) FROM likes), 1), true);

-- Comment likes table
SELECT setval('comment_likes_id_seq', COALESCE((SELECT MAX(id) FROM comment_likes), 1), true);

-- Follows table
SELECT setval('follows_id_seq', COALESCE((SELECT MAX(id) FROM follows), 1), true);

-- Stories table
SELECT setval('stories_id_seq', COALESCE((SELECT MAX(id) FROM stories), 1), true);

-- Story views table
SELECT setval('story_views_id_seq', COALESCE((SELECT MAX(id) FROM story_views), 1), true);

-- Conversations table
SELECT setval('conversations_id_seq', COALESCE((SELECT MAX(id) FROM conversations), 1), true);

-- Messages table
SELECT setval('messages_id_seq', COALESCE((SELECT MAX(id) FROM messages), 1), true);

-- Message reactions table
SELECT setval('message_reactions_id_seq', COALESCE((SELECT MAX(id) FROM message_reactions), 1), true);

-- Typing indicators table
SELECT setval('typing_indicators_id_seq', COALESCE((SELECT MAX(id) FROM typing_indicators), 1), true);

-- Notifications table
SELECT setval('notifications_id_seq', COALESCE((SELECT MAX(id) FROM notifications), 1), true);

-- Blocked users table
SELECT setval('blocked_users_id_seq', COALESCE((SELECT MAX(id) FROM blocked_users), 1), true);

-- Reports table
SELECT setval('reports_id_seq', COALESCE((SELECT MAX(id) FROM reports), 1), true);

-- Saved posts table
SELECT setval('saved_posts_id_seq', COALESCE((SELECT MAX(id) FROM saved_posts), 1), true);

-- Post tags table
SELECT setval('post_tags_id_seq', COALESCE((SELECT MAX(id) FROM post_tags), 1), true);

-- Group chats table
SELECT setval('group_chats_id_seq', COALESCE((SELECT MAX(id) FROM group_chats), 1), true);

-- Group chat members table
SELECT setval('group_chat_members_id_seq', COALESCE((SELECT MAX(id) FROM group_chat_members), 1), true);

-- Group chat messages table
SELECT setval('group_chat_messages_id_seq', COALESCE((SELECT MAX(id) FROM group_chat_messages), 1), true);

-- Group messages table
SELECT setval('group_messages_id_seq', COALESCE((SELECT MAX(id) FROM group_messages), 1), true);

-- Lessons table
SELECT setval('lessons_id_seq', COALESCE((SELECT MAX(id) FROM lessons), 1), true);

-- Lesson progress table
SELECT setval('lesson_progress_id_seq', COALESCE((SELECT MAX(id) FROM lesson_progress), 1), true);

-- Daily verses table
SELECT setval('daily_verses_id_seq', COALESCE((SELECT MAX(id) FROM daily_verses), 1), true);

-- Support requests table
SELECT setval('support_requests_id_seq', COALESCE((SELECT MAX(id) FROM support_requests), 1), true);

-- Testimonies table
SELECT setval('testimonies_id_seq', COALESCE((SELECT MAX(id) FROM testimonies), 1), true);

-- Encryption keys table
SELECT setval('encryption_keys_id_seq', COALESCE((SELECT MAX(id) FROM encryption_keys), 1), true);

-- Friendships table
SELECT setval('friendships_id_seq', COALESCE((SELECT MAX(id) FROM friendships), 1), true);

-- User privacy settings table
SELECT setval('user_privacy_settings_id_seq', COALESCE((SELECT MAX(id) FROM user_privacy_settings), 1), true);

-- Calls table
SELECT setval('calls_id_seq', COALESCE((SELECT MAX(id) FROM calls), 1), true);

-- Verification codes table
SELECT setval('verification_codes_id_seq', COALESCE((SELECT MAX(id) FROM verification_codes), 1), true);

-- Reactions table
SELECT setval('reactions_id_seq', COALESCE((SELECT MAX(id) FROM reactions), 1), true);

-- Shares table
SELECT setval('shares_id_seq', COALESCE((SELECT MAX(id) FROM shares), 1), true);

-- VPN logs table
SELECT setval('vpn_logs_id_seq', COALESCE((SELECT MAX(id) FROM vpn_logs), 1), true);

-- ============================================
-- Verification: Show all sequences status
-- ============================================

SELECT 
    schemaname,
    sequencename,
    last_value,
    (SELECT MAX(id) FROM users) as users_max,
    (SELECT MAX(id) FROM posts) as posts_max,
    (SELECT MAX(id) FROM messages) as messages_max
FROM pg_sequences 
WHERE schemaname = 'public' 
ORDER BY sequencename;
