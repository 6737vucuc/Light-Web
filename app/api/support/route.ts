import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportRequests, testimonies } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { type, subject, message } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: 'Type and message are required' },
        { status: 400 }
      );
    }

    // If it's a testimony, save to testimonies table
    if (type === 'testimony') {
      await db.insert(testimonies).values({
        userId: authResult.user.id,
        content: message,
        status: 'pending',
      });
    } else {
      // Otherwise, save to support requests
      await db.insert(supportRequests).values({
        userId: authResult.user.id,
        type,
        subject,
        message,
        status: 'pending',
      });
    }

    return NextResponse.json({
      message: 'Request submitted successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting support request:', error);
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}

