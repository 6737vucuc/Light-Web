import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    const { id } = await params;
    const groupId = parseInt(id);

    // Check if already a member
    const [existingMember] = await sql`
      SELECT id FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${decoded.userId}
    `;

    if (existingMember) {
      // Update last_active timestamp for existing member
      await sql`
        UPDATE group_members 
        SET last_active = NOW()
        WHERE group_id = ${groupId} AND user_id = ${decoded.userId}
      `;
      return NextResponse.json({ message: 'Already a member' });
    }

    // Add user to group
    await sql`
      INSERT INTO group_members (group_id, user_id, role, joined_at, last_active)
      VALUES (${groupId}, ${decoded.userId}, 'member', NOW(), NOW())
    `;

    // Update members count with actual count
    const [countResult] = await sql`
      SELECT COUNT(DISTINCT user_id) as count FROM group_members 
      WHERE group_id = ${groupId}
    `;

    await sql`
      UPDATE community_groups 
      SET members_count = ${countResult.count}
      WHERE id = ${groupId}
    `;

    return NextResponse.json({ message: 'Joined successfully' });
  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
