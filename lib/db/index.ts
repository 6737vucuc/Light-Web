import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Drizzle ORM instance
export const db = drizzle(process.env.DATABASE_URL!, { schema });

// Raw SQL client for complex queries
export const sql = neon(process.env.DATABASE_URL!);
