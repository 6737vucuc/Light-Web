import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';
import { sendAccountBannedAlert, sendAccountUnbannedAlert } from '@/lib/security-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ban or unban a user (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Default to true if 'ban' is not provided, as this is the 'ban-user' endpoint
    const { userId, ban = true, reason, duration } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent admin from banning themselves
    if (userId === user.userId) {
      return NextResponse.json(
        { error: 'You cannot ban yourself' },
        { status: 400 }
      );
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent banning other admins
    if (targetUser.isAdmin) {
      return NextResponse.json(
        { error: 'Cannot ban other administrators' },
        { status: 400 }
      );
    }

    let bannedUntil = null;
    if (ban && duration) {
      // Calculate ban expiration date
      const now = new Date();
      bannedUntil = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000); // duration in days
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        isBanned: ban,
        bannedUntil: ban ? bannedUntil : null,
        bannedReason: ban ? reason : null,
      })
      .where(eq(users.id, userId))
      .returning();

    // Send email notification
    try {
      if (ban) {
        await sendAccountBannedAlert(
          targetUser.name,
          targetUser.email,
          reason || 'Violation of Terms of Service',
          duration,
          bannedUntil || undefined
        );
        console.log(`Ban notification sent to: ${targetUser.email}`);
      } else {
        await sendAccountUnbannedAlert(
          targetUser.name,
          targetUser.email
        );
        console.log(`Unban notification sent to: ${targetUser.email}`);
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      message: ban ? 'User banned successfully' : 'User unbanned successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        isBanned: updatedUser.isBanned,
        bannedUntil: updatedUser.bannedUntil,
        bannedReason: updatedUser.bannedReason,
      },
    });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user ban status' },
      { status: 500 }
    );
  }
}
