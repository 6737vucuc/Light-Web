export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMessages } from '@/lib/db/schema';
import { lt } from 'drizzle-orm';

// This endpoint is called by Vercel Cron every hour
    // Deletes group chat messages older than 1 hour
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

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Delete group messages older than 1 hour
    await db
      .delete(groupMessages)
      .where(lt(groupMessages.createdAt, oneHourAgo));

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

