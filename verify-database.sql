-- Database Verification Script
-- This script verifies all tables and their structure

-- ============================================
-- 1. Check all tables exist
-- ============================================

SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- 2. Check missing columns in critical tables
-- ============================================

-- Check users table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check messages table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Check group_chat_messages table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'group_chat_messages'
ORDER BY ordinal_position;

-- ============================================
-- 3. Check all sequences and their status
-- ============================================

SELECT 
    s.sequencename,
    s.last_value,
    (
        SELECT MAX(c.column_name::text)
        FROM information_schema.columns c
        WHERE c.table_name = REPLACE(s.sequencename, '_id_seq', '')
            AND c.column_name = 'id'
    ) as has_id_column
FROM pg_sequences s
WHERE s.schemaname = 'public'
ORDER BY s.sequencename;

-- ============================================
-- 4. Check for any data in tables
-- ============================================

SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'follows', COUNT(*) FROM follows
UNION ALL
SELECT 'stories', COUNT(*) FROM stories
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'group_chats', COUNT(*) FROM group_chats
UNION ALL
SELECT 'group_chat_messages', COUNT(*) FROM group_chat_messages
UNION ALL
SELECT 'calls', COUNT(*) FROM calls
ORDER BY table_name;
