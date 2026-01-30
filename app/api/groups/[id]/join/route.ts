import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verify(token, process.env.JWT_SECRET!) as any;
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const groupId = parseInt(id);

    // Check if already a member
    const existing = await sql`
      SELECT id FROM group_members WHERE group_id = ${groupId} AND user_id = ${decoded.userId}
    `;

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Already a member' });
    }

    // Add user to group
    await sql`
      INSERT INTO group_members (group_id, user_id, role, joined_at)
      VALUES (${groupId}, ${decoded.userId}, 'member', NOW())
    `;

    // Update members count
    const countResult = await sql`SELECT COUNT(*) as count FROM group_members WHERE group_id = ${groupId}`;
    const count = parseInt(countResult[0].count);

    await sql`
      UPDATE community_groups SET members_count = ${count} WHERE id = ${groupId}
    `;

    return NextResponse.json({ message: 'Joined successfully', membersCount: count });
  } catch (error: any) {
    console.error('Error joining group:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
