import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      verify(token, process.env.JWT_SECRET!);
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const groupId = parseInt(id);

    // Get all members with user info
    const allMembers = await sql`
      SELECT 
        gm.id, gm.user_id, gm.role, gm.joined_at, gm.last_active,
        u.name, u.username, u.avatar
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ${groupId}
    `;

    // Calculate online members (active in last 5 minutes)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const onlineMembers = allMembers.filter(m => {
      if (!m.last_active) return false;
      return new Date(m.last_active) > fiveMinutesAgo;
    });

    return NextResponse.json({
      totalMembers: allMembers.length,
      onlineMembers: onlineMembers.length,
      members: onlineMembers.map(m => ({
        id: m.user_id,
        name: m.name,
        username: m.username,
        avatar: m.avatar,
        role: m.role,
        joinedAt: m.joined_at,
        lastActive: m.last_active
      })),
    });
  } catch (error: any) {
    console.error('Error fetching group stats:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
