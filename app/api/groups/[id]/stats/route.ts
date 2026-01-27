import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
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

    // Get total members count
    const [membersResult] = await sql`
      SELECT COUNT(DISTINCT user_id) as count FROM group_members 
      WHERE group_id = ${groupId}
    `;

    // Get online members count (active in last 5 minutes)
    const [onlineResult] = await sql`
      SELECT COUNT(DISTINCT user_id) as count FROM group_members 
      WHERE group_id = ${groupId} 
      AND last_active > NOW() - INTERVAL '5 minutes'
    `;

    return NextResponse.json({ 
      totalMembers: parseInt(membersResult.count) || 0,
      onlineMembers: parseInt(onlineResult.count) || 0
    });
  } catch (error) {
    console.error('Error fetching group stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
