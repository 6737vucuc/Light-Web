const { Pool } = require('pg');
const fs = require('fs');

const connectionString = 'postgresql://neondb_owner:npg_Hf73CljbDXzF@ep-fancy-forest-aedpagn2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Connected to database');
    console.log('🔄 Running migration...\n');

    // Read SQL file
    const sql = fs.readFileSync('fix-database.sql', 'utf8');
    
    // Execute SQL
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Verifying tables...\n');

    // Verify tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Tables in database:', tablesResult.rows.length);
    tablesResult.rows.forEach(row => {
      console.log('  ✓', row.table_name);
    });

    // Verify users columns
    console.log('\n📊 Verifying users table columns...\n');
    const usersColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in users table:', usersColumns.rows.length);
    const criticalColumns = ['username', 'posts_count', 'followers_count', 'following_count'];
    criticalColumns.forEach(col => {
      const exists = usersColumns.rows.some(r => r.column_name === col);
      console.log(exists ? '  ✓' : '  ✗', col);
    });

    // Verify messages columns
    console.log('\n📊 Verifying messages table columns...\n');
    const messagesColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);
    
    const criticalMessagesColumns = ['conversation_id', 'message_type', 'media_url'];
    criticalMessagesColumns.forEach(col => {
      const exists = messagesColumns.rows.some(r => r.column_name === col);
      console.log(exists ? '  ✓' : '  ✗', col);
    });

    console.log('\n✅ All done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n🎉 Migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  });
