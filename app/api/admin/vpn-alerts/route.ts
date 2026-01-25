import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendVPNAlert } from '@/lib/security-email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, ipAddress, detection } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Send warning email
    await sendVPNAlert(user.name, email, ipAddress, detection);

    return NextResponse.json({
      success: true,
      message: 'Warning email sent successfully',
    });
  } catch (error) {
    console.error('VPN alert error:', error);
    return NextResponse.json(
      { error: 'Failed to send alert' },
      { status: 500 }
    );
  }
}
