import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    
    // Check if user is admin
    const [user] = await sql`
      SELECT is_admin FROM users WHERE id = ${decoded.userId}
    `;

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all groups with member counts
    const groups = await sql`
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
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    
    // Check if user is admin
    const [user] = await sql`
      SELECT is_admin FROM users WHERE id = ${decoded.userId}
    `;

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description, color, icon, avatar } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Create new group
    const [newGroup] = await sql`
      INSERT INTO community_groups (name, description, color, icon, avatar, created_by)
      VALUES (${name}, ${description || null}, ${color || '#8B5CF6'}, ${icon || 'users'}, ${avatar || null}, ${decoded.userId})
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
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    
    // Check if user is admin
    const [user] = await sql`
      SELECT is_admin FROM users WHERE id = ${decoded.userId}
    `;

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('id');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Delete group messages first
    await sql`DELETE FROM message_reactions WHERE message_id IN (SELECT id FROM group_messages WHERE group_id = ${groupId})`;
    await sql`DELETE FROM group_messages WHERE group_id = ${groupId}`;
    
    // Delete group members
    await sql`DELETE FROM group_members WHERE group_id = ${groupId}`;
    
    // Delete group
    await sql`DELETE FROM community_groups WHERE id = ${groupId}`;

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
