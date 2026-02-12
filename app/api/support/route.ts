import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create a new support request
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, subject, message } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: 'Type and message are required' },
        { status: 400 }
      );
    }

    // Map type to category
    const categoryMap: Record<string, string> = {
      technical: 'technical',
      testimony: 'testimony',
      prayer: 'prayer',
    };

    const category = categoryMap[type] || type || 'general';

    // Create support ticket
    const [ticket] = await db.insert(supportTickets).values({
      userId: user.userId,
      subject: subject || type,
      message,
      category,
      status: 'open',
      priority: 'normal',
    }).returning();

    return NextResponse.json({
      message: 'Support request submitted successfully',
      ticket,
    });
  } catch (error) {
    console.error('Support request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit support request' },
      { status: 500 }
    );
  }
}
