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
  connectionTimeoutMillis: 10000, // Increased timeout
  idleTimeoutMillis: 30000, // Increased idle timeout
  max: 2, // Reduced to 2 for Supabase Session mode (conservative limit)
  min: 0, // No minimum connections
  allowExitOnIdle: true, // Allow pool to exit when idle
  ssl: process.env.NODE_ENV === 'production' 
       ? { rejectUnauthorized: true } // Enforce SSL certificate verification in production
       : { rejectUnauthorized: false }, // Allow self-signed certs in development
});

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
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
