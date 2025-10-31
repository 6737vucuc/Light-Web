import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
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

// Create connection pool
const pool = databaseUrl 
  ? new Pool({ connectionString: databaseUrl })
  : new Pool({ connectionString: 'postgresql://dummy:dummy@localhost:5432/dummy' });

// Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Export pool for raw queries if needed
export const sql = pool;
