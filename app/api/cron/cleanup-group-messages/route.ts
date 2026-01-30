import { NextRequest, NextResponse } from 'next/server';
import { sql as rawSql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow if no secret is set (for development)
      if (process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Starting group messages cleanup...');

    // Delete all message reactions first
    const deletedReactions = await rawSql`
      DELETE FROM message_reactions 
      WHERE message_id IN (SELECT id FROM group_messages)
    `;

    // Delete all group messages
    const deletedMessages = await rawSql`
      DELETE FROM group_messages
      RETURNING id
    `;

    // Reset messages count for all groups
    await rawSql`
      UPDATE community_groups 
      SET messages_count = 0
    `;

    console.log(`Cleanup completed: ${deletedMessages.length} messages deleted, ${deletedReactions.length} reactions deleted`);

    return NextResponse.json({
      success: true,
      deletedMessages: deletedMessages.length,
      deletedReactions: deletedReactions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error cleaning up group messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
