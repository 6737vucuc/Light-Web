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

// Singleton pattern for Pool to prevent connection leaks in Next.js hot-reloading
const globalForPg = global as unknown as { pool: Pool };

const pool = globalForPg.pool || new Pool({ 
  connectionString: databaseUrl || 'postgresql://dummy:dummy@localhost:5432/dummy',
  connectionTimeoutMillis: 5000, 
  idleTimeoutMillis: 10000, 
  max: 5, // Reduced to 5 for Supabase Transaction mode stability
  ssl: databaseUrl ? { rejectUnauthorized: false } : false,
});

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;

// Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Raw SQL query function using pg pool
export async function sql(strings: TemplateStringsArray, ...values: any[]) {
  // Use pool.query directly to avoid manual connect/release overhead
  let query = '';
  let paramIndex = 1;
  for (let i = 0; i < strings.length; i++) {
    query += strings[i];
    if (i < values.length) {
      query += `$${paramIndex++}`;
    }
  }
  
  const result = await pool.query(query, values);
  return result.rows;
}

// Export pool for direct access if needed
export { pool };
