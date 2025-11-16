import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    const groupId = parseInt(params.id);

    // Check if already a member
    const [existingMember] = await sql`
      SELECT id FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${decoded.userId}
    `;

    if (existingMember) {
      return NextResponse.json({ message: 'Already a member' });
    }

    // Add user to group
    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${groupId}, ${decoded.userId}, 'member')
    `;

    // Update members count
    await sql`
      UPDATE community_groups 
      SET members_count = members_count + 1
      WHERE id = ${groupId}
    `;

    return NextResponse.json({ message: 'Joined successfully' });
  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
