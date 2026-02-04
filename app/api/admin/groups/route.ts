import { NextRequest, NextResponse } from 'next/server';
import { db, sql as rawSql } from '@/lib/db';
import { communityGroups, groupMembers, groupMessages, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, sql, count } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { isAdmin: true }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all groups with member counts using raw SQL
    const groups = await rawSql`
      SELECT 
        cg.*,
        COUNT(DISTINCT gm.id) as actual_members_count,
        u.name as creator_name,
        u.username as creator_username
      FROM community_groups cg
      LEFT JOIN group_members gm ON cg.id = gm.group_id
      LEFT JOIN users u ON cg.created_by = u.id
      GROUP BY cg.id, u.name, u.username
      ORDER BY cg.created_at DESC
    `;

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { isAdmin: true }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description, color, icon, avatar } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Create new group using raw SQL to handle nullable created_by
    const [newGroup] = await rawSql`
      INSERT INTO community_groups (name, description, color, icon, avatar, created_by)
      VALUES (${name}, ${description || null}, ${color || '#8B5CF6'}, ${icon || 'users'}, ${avatar || null}, ${user.userId})
      RETURNING *
    `;

    return NextResponse.json({ group: newGroup }, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { isAdmin: true }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('id');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const gId = parseInt(groupId);

    // Delete related data using raw SQL
    await rawSql`DELETE FROM message_reactions WHERE message_id IN (SELECT id FROM group_messages WHERE group_id = ${gId})`;
    await rawSql`DELETE FROM group_messages WHERE group_id = ${gId}`;
    await rawSql`DELETE FROM group_members WHERE group_id = ${gId}`;
    await rawSql`DELETE FROM community_groups WHERE id = ${gId}`;

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { isAdmin: true }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action } = await request.json();

    if (action === 'clearAll') {
      await rawSql`DELETE FROM message_reactions WHERE message_id IN (SELECT id FROM group_messages)`;
      await rawSql`DELETE FROM group_messages`;
      await rawSql`DELETE FROM group_members`;
      await rawSql`DELETE FROM community_groups`;
      return NextResponse.json({ message: 'All groups cleared successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error clearing groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
