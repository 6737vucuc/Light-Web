import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neon } from '@neondatabase/serverless';
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

// Create connection pool for Drizzle ORM
const pool = databaseUrl 
  ? new Pool({ connectionString: databaseUrl })
  : new Pool({ connectionString: 'postgresql://dummy:dummy@localhost:5432/dummy' });

// Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Raw SQL client using neon (for template literal queries)
export const sql = databaseUrl
  ? neon(databaseUrl)
  : neon('postgresql://dummy:dummy@localhost:5432/dummy');
