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
    const userId = decoded.userId;

    // 1. Check if already a member (using a very safe query)
    let existing;
    try {
      existing = await sql`SELECT id FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId} LIMIT 1`;
    } catch (e) {
      console.error('Check membership failed:', e);
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Already a member', status: 'existing' });
    }

    // 2. Try to insert with multiple possible column names for timestamp
    try {
      // Try standard joined_at first
      await sql`
        INSERT INTO group_members (group_id, user_id, role, joined_at)
        VALUES (${groupId}, ${userId}, 'member', NOW())
      `;
    } catch (insertError: any) {
      console.error('First insert attempt failed, trying alternative:', insertError.message);
      try {
        // Try without joined_at (letting DB handle default)
        await sql`
          INSERT INTO group_members (group_id, user_id, role)
          VALUES (${groupId}, ${userId}, 'member')
        `;
      } catch (secondError: any) {
        return NextResponse.json({ 
          error: 'DATABASE_INSERT_FAILED', 
          details: secondError.message,
          hint: 'Check if group_members table exists and has correct columns'
        }, { status: 500 });
      }
    }

    // 3. Update members count (silent fail - don't block the user)
    try {
      const countResult = await sql`SELECT COUNT(*) as count FROM group_members WHERE group_id = ${groupId}`;
      const count = parseInt(countResult[0].count);
      await sql`UPDATE community_groups SET members_count = ${count} WHERE id = ${groupId}`;
    } catch (e) {
      console.warn('Count update failed (non-critical):', e);
    }

    return NextResponse.json({ message: 'Joined successfully', status: 'success' });
  } catch (error: any) {
    console.error('Global join error:', error);
    return NextResponse.json({ 
      error: 'CRITICAL_JOIN_ERROR', 
      details: error.message 
    }, { status: 500 });
  }
}
