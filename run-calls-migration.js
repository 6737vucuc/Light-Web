const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Hf73CljbDXzF@ep-fancy-forest-aedpagn2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function runMigration() {
  try {
    console.log('🔄 Running calls table migration...');
    
    // Create calls table
    await sql`
      CREATE TABLE IF NOT EXISTS calls (
        id SERIAL PRIMARY KEY,
        caller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('video', 'audio', 'voice')),
        room_id VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(20) DEFAULT 'ringing' CHECK (status IN ('ringing', 'ongoing', 'ended', 'declined', 'missed')),
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        duration INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Calls table created');
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON calls(receiver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_calls_room_id ON calls(room_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at)`;
    console.log('✅ Indexes created');
    
    console.log('✅ Calls table migration completed successfully!');
    
    // Verify table was created
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'calls'
    `;
    
    if (result.length > 0) {
      console.log('✅ Calls table verified in database');
    } else {
      console.log('❌ Calls table not found after migration');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
