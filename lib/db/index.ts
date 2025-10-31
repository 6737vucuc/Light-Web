import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
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

// Drizzle ORM instance with conditional initialization
export const db = databaseUrl 
  ? drizzle(databaseUrl, { schema })
  : drizzle('postgresql://dummy:dummy@localhost:5432/dummy', { schema });

// Raw SQL client for complex queries
export const sql = databaseUrl 
  ? neon(databaseUrl)
  : neon('postgresql://dummy:dummy@localhost:5432/dummy');
