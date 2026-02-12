import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify if user is admin (optional but recommended)
    const user = await verifyAuth(request);
    if (!user || !user.userId || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SQL to create direct_messages table if it doesn't exist
    // Based on the error message fields and schema.ts
    await sql`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        receiver_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT,
        message_type VARCHAR(20) DEFAULT 'text',
        media_url TEXT,
        is_encrypted BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Also ensure group_messages and other community tables exist
    await sql`
      CREATE TABLE IF NOT EXISTS community_groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#8B5CF6',
        icon VARCHAR(50) DEFAULT 'users',
        created_by INTEGER NOT NULL REFERENCES users(id),
        members_count INTEGER DEFAULT 0,
        messages_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES community_groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        role VARCHAR(20) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS group_messages (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES community_groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT,
        image_url TEXT,
        type VARCHAR(20) DEFAULT 'text',
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Database tables initialized successfully' 
    });
  } catch (error: any) {
    console.error('Database initialization error:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize database', 
      details: error.message 
    }, { status: 500 });
  }
}
