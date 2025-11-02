export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupChatMessages } from '@/lib/db/schema';
import { lt } from 'drizzle-orm';

// This endpoint is called by Vercel Cron daily
    // Deletes group chat messages older than 24 hours
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Delete group messages older than 24 hours
    await db
      .delete(groupChatMessages)
      .where(lt(groupChatMessages.createdAt, oneDayAgo));

    return NextResponse.json({
      success: true,
      message: 'Group messages cleaned up successfully',
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cleanup messages error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup messages' },
      { status: 500 }
    );
  }
}

