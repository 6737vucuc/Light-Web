-- ============================================
-- Complete ID Fix Script
-- This script fixes ALL ID-related issues
-- ============================================

-- Step 1: Sync all sequences with their max IDs
DO $$
DECLARE
    r RECORD;
    max_id INTEGER;
    seq_name TEXT;
BEGIN
    -- Loop through all tables with id columns
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        -- Check if table has an id column
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = r.table_name 
            AND column_name = 'id'
        ) THEN
            -- Get sequence name
            seq_name := r.table_name || '_id_seq';
            
            -- Check if sequence exists
            IF EXISTS (
                SELECT 1 
                FROM pg_sequences 
                WHERE schemaname = 'public' 
                AND sequencename = seq_name
            ) THEN
                -- Get max ID from table
                EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', r.table_name) INTO max_id;
                
                -- Set sequence to max_id + 1
                EXECUTE format('SELECT setval(%L, %s, true)', seq_name, GREATEST(max_id, 1));
                
                RAISE NOTICE 'Fixed sequence % to %', seq_name, GREATEST(max_id, 1);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Step 2: Verify all sequences
SELECT 
    t.table_name,
    s.sequencename,
    s.last_value as sequence_value,
    (SELECT MAX(id) FROM pg_catalog.pg_class WHERE relname = t.table_name) as max_id_estimate
FROM information_schema.tables t
LEFT JOIN pg_sequences s ON s.sequencename = t.table_name || '_id_seq'
WHERE t.table_schema = 'public' 
AND t.table_type = 'BASE TABLE'
AND EXISTS (
    SELECT 1 
    FROM information_schema.columns c 
    WHERE c.table_name = t.table_name 
    AND c.column_name = 'id'
)
ORDER BY t.table_name;

-- Step 3: Check for any duplicate IDs
DO $$
DECLARE
    r RECORD;
    dup_count INTEGER;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = r.table_name 
            AND column_name = 'id'
        ) THEN
            EXECUTE format('SELECT COUNT(*) - COUNT(DISTINCT id) FROM %I', r.table_name) INTO dup_count;
            
            IF dup_count > 0 THEN
                RAISE WARNING 'Table % has % duplicate IDs!', r.table_name, dup_count;
            END IF;
        END IF;
    END LOOP;
END $$;

-- Step 4: Show final status
SELECT 
    'All sequences synced successfully!' as status,
    COUNT(*) as total_sequences
FROM pg_sequences 
WHERE schemaname = 'public';
