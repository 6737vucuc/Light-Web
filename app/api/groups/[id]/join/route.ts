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

    // 1. Check if already a member
    let existing;
    try {
      existing = await sql`SELECT id FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId} LIMIT 1`;
    } catch (e) {}

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Already a member', status: 'existing' });
    }

    // 2. Try multiple insert strategies to match the actual DB schema
    const insertStrategies = [
      // Strategy A: Standard with joined_at
      async () => sql`INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (${groupId}, ${userId}, 'member', NOW())`,
      // Strategy B: Standard with created_at
      async () => sql`INSERT INTO group_members (group_id, user_id, role, created_at) VALUES (${groupId}, ${userId}, 'member', NOW())`,
      // Strategy C: Minimal (let DB handle defaults)
      async () => sql`INSERT INTO group_members (group_id, user_id, role) VALUES (${groupId}, ${userId}, 'member')`,
      // Strategy D: Very Minimal
      async () => sql`INSERT INTO group_members (group_id, user_id) VALUES (${groupId}, ${userId})`
    ];

    let success = false;
    let lastError = '';

    for (const strategy of insertStrategies) {
      try {
        await strategy();
        success = true;
        break;
      } catch (e: any) {
        lastError = e.message;
        console.error('Strategy failed:', e.message);
      }
    }

    if (!success) {
      return NextResponse.json({ 
        error: 'DATABASE_INSERT_FAILED', 
        details: lastError,
        hint: 'Check group_members table columns'
      }, { status: 500 });
    }

    // 3. Update members count (silent fail)
    try {
      await sql`UPDATE community_groups SET members_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ${groupId}) WHERE id = ${groupId}`;
    } catch (e) {}

    return NextResponse.json({ message: 'Joined successfully', status: 'success' });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'CRITICAL_JOIN_ERROR', 
      details: error.message 
    }, { status: 500 });
  }
}
