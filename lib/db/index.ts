import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Check if DATABASE_URL is available
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  // During build time, use a dummy connection
  console.warn('DATABASE_URL not set, using dummy connection for build');
}

// Create connection pool for Drizzle ORM with timeout settings
const pool = new Pool({ 
  connectionString: databaseUrl || 'postgresql://dummy:dummy@localhost:5432/dummy',
  connectionTimeoutMillis: 10000, // 10 seconds timeout
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  max: 10, // Maximum 10 connections
  ssl: databaseUrl ? { rejectUnauthorized: false } : false,
});

// Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Raw SQL query function using pg pool
export async function sql(strings: TemplateStringsArray, ...values: any[]) {
  const client = await pool.connect();
  try {
    // Build the query with numbered parameters
    let query = '';
    let paramIndex = 1;
    for (let i = 0; i < strings.length; i++) {
      query += strings[i];
      if (i < values.length) {
        query += `$${paramIndex++}`;
      }
    }
    
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

// Export pool for direct access if needed
export { pool };
