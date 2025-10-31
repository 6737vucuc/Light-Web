const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_Hf73CljbDXzF@ep-fancy-forest-aedpagn2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require');

async function testConnection() {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('✅ Database connection successful!');
    console.log('Current time:', result[0].now);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
  }
}

testConnection();
