import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const body = await request.json();
    const { isPrivate, hideFollowers, hideFollowing, allowComments, allowMessages } = body;

    const updateData: any = {};
    
    if (typeof isPrivate === 'boolean') updateData.isPrivate = isPrivate;
    if (typeof hideFollowers === 'boolean') updateData.hideFollowers = hideFollowers;
    if (typeof hideFollowing === 'boolean') updateData.hideFollowing = hideFollowing;
    if (allowComments) updateData.allowComments = allowComments;
    if (allowMessages) updateData.allowMessages = allowMessages;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      ...updateData,
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
