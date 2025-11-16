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

    // Get all active groups with member counts
    const groups = await sql`
      SELECT 
        cg.*,
        COUNT(DISTINCT gm.id) as members_count,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = cg.id AND user_id = ${decoded.userId}
          ) THEN true 
          ELSE false 
        END as is_member
      FROM community_groups cg
      LEFT JOIN group_members gm ON cg.id = gm.group_id
      WHERE cg.is_active = true
      GROUP BY cg.id
      ORDER BY cg.created_at DESC
    `;

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
