export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, sql as rawSql } from 'drizzle-orm';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // Update lastSeen and set isOnline to false
    await db
      .update(users)
      .set({ 
        lastSeen: new Date(),
        isOnline: false 
      })
      .where(eq(users.id, authResult.user.id));

    // Notify contacts about offline status via Supabase Realtime
    const supabaseAdmin = getSupabaseAdmin();

    // Find all users this user has messaged with
    const conversations = await db.execute(rawSql`
      SELECT DISTINCT
        CASE 
          WHEN sender_id = ${authResult.user.id} THEN receiver_id
          ELSE sender_id
        END as other_user_id
      FROM direct_messages
      WHERE sender_id = ${authResult.user.id} OR receiver_id = ${authResult.user.id}
    `);

    // Notify each contact
    const results = Array.isArray(conversations) ? conversations : (conversations as any).rows || [];
    const contactIds = results.map((c: any) => c.other_user_id).filter(Boolean);
    
    if (contactIds.length > 0) {
      for (const contactId of contactIds) {
        const channel = supabaseAdmin.channel(`user-${contactId}`);
        await channel.send({
          type: 'broadcast',
          event: 'online-status',
          payload: {
            userId: authResult.user.id,
            isOnline: false,
            lastSeen: new Date().toISOString()
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set offline error:', error);
    return NextResponse.json(
      { error: 'Failed to set offline status' },
      { status: 500 }
    );
  }
}
