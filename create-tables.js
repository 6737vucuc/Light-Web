const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Hf73CljbDXzF@ep-fancy-forest-aedpagn2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString,
});

async function createTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Connected to database');
    console.log('🔄 Creating tables...\n');

    // Get existing tables
    const existingTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = existingTablesResult.rows.map(r => r.table_name);
    console.log('📊 Existing tables:', existingTables.join(', '));
    console.log('');

    // List of all required tables from schema
    const requiredTables = [
      'users',
      'verification_codes',
      'posts',
      'likes',
      'comments',
      'comment_likes',
      'follows',
      'stories',
      'story_views',
      'conversations',
      'messages',
      'message_reactions',
      'typing_indicators',
      'notifications',
      'blocked_users',
      'reports',
      'saved_posts',
      'post_tags',
      'group_chats',
      'group_chat_members',
      'group_chat_messages',
      'lessons',
      'lesson_progress',
      'daily_verses',
      'testimonies',
      'support_requests',
      'encryption_keys',
      'friendships',
      'user_privacy_settings'
    ];

    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length === 0) {
      console.log('✅ All tables already exist!');
    } else {
      console.log('❌ Missing tables:', missingTables.join(', '));
      console.log('');
      console.log('⚠️  You need to run: pnpm drizzle-kit push');
      console.log('   Or use Drizzle Studio to sync the schema');
    }

    // Check for missing columns in existing tables
    console.log('\n🔍 Checking for missing columns...\n');
    
    // Check users table
    if (existingTables.includes('users')) {
      const usersColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      const columnNames = usersColumns.rows.map(r => r.column_name);
      
      const requiredColumns = [
        'id', 'name', 'email', 'username', 'password', 'avatar', 'cover_photo',
        'bio', 'website', 'gender', 'country', 'religion', 'birth_date',
        'first_name', 'last_name', 'location', 'work', 'education',
        'relationship_status', 'posts_count', 'followers_count', 'following_count',
        'is_private', 'hide_followers', 'hide_following', 'allow_comments',
        'allow_messages', 'privacy_posts', 'privacy_friends_list', 'privacy_profile',
        'privacy_photos', 'privacy_messages', 'privacy_friend_requests',
        'hide_online_status', 'is_admin', 'is_banned', 'banned_until',
        'email_verified', 'last_seen', 'created_at', 'updated_at', 'username_last_changed'
      ];
      
      const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));
      
      if (missingColumns.length > 0) {
        console.log('❌ users table missing columns:', missingColumns.join(', '));
      } else {
        console.log('✅ users table has all required columns');
      }
    }

    // Check messages table
    if (existingTables.includes('messages')) {
      const messagesColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'messages'
      `);
      const columnNames = messagesColumns.rows.map(r => r.column_name);
      
      const requiredColumns = [
        'id', 'conversation_id', 'sender_id', 'receiver_id', 'message_type',
        'content', 'encrypted_content', 'is_encrypted', 'media_url', 'post_id',
        'reply_to_id', 'is_read', 'read_at', 'is_deleted', 'deleted_at',
        'deleted_by_sender', 'deleted_by_receiver', 'created_at', 'updated_at'
      ];
      
      const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));
      
      if (missingColumns.length > 0) {
        console.log('❌ messages table missing columns:', missingColumns.join(', '));
      } else {
        console.log('✅ messages table has all required columns');
      }
    }

    // Check group_chats table
    if (existingTables.includes('group_chats')) {
      const groupChatsColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'group_chats'
      `);
      const columnNames = groupChatsColumns.rows.map(r => r.column_name);
      
      const requiredColumns = [
        'id', 'name', 'description', 'avatar', 'cover_photo', 'privacy',
        'members_count', 'created_by', 'created_at', 'updated_at'
      ];
      
      const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));
      
      if (missingColumns.length > 0) {
        console.log('❌ group_chats table missing columns:', missingColumns.join(', '));
      } else {
        console.log('✅ group_chats table has all required columns');
      }
    }

    // Check group_chat_messages table
    if (existingTables.includes('group_chat_messages')) {
      const groupMessagesColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'group_chat_messages'
      `);
      const columnNames = groupMessagesColumns.rows.map(r => r.column_name);
      
      const requiredColumns = [
        'id', 'group_id', 'sender_id', 'content', 'encrypted_content',
        'media_url', 'is_deleted', 'deleted_at', 'created_at'
      ];
      
      const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));
      
      if (missingColumns.length > 0) {
        console.log('❌ group_chat_messages table missing columns:', missingColumns.join(', '));
      } else {
        console.log('✅ group_chat_messages table has all required columns');
      }
    }

    console.log('\n✅ Database check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTables()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });
