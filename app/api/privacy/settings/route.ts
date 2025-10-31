import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

// GET privacy settings
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const [user] = await db
      .select({
        privacyPosts: users.privacyPosts,
        privacyFriendsList: users.privacyFriendsList,
        privacyProfile: users.privacyProfile,
        privacyPhotos: users.privacyPhotos,
        privacyMessages: users.privacyMessages,
        privacyFriendRequests: users.privacyFriendRequests,
        hideOnlineStatus: users.hideOnlineStatus,
      })
      .from(users)
      .where(eq(users.id, authResult.user.id));

    return NextResponse.json({ settings: user });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings' },
      { status: 500 }
    );
  }
}

// POST update privacy settings
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
    const {
      privacyPosts,
      privacyFriendsList,
      privacyProfile,
      privacyPhotos,
      privacyMessages,
      privacyFriendRequests,
      hideOnlineStatus,
    } = body;

    const updateData: any = {};
    
    if (privacyPosts !== undefined) updateData.privacyPosts = privacyPosts;
    if (privacyFriendsList !== undefined) updateData.privacyFriendsList = privacyFriendsList;
    if (privacyProfile !== undefined) updateData.privacyProfile = privacyProfile;
    if (privacyPhotos !== undefined) updateData.privacyPhotos = privacyPhotos;
    if (privacyMessages !== undefined) updateData.privacyMessages = privacyMessages;
    if (privacyFriendRequests !== undefined) updateData.privacyFriendRequests = privacyFriendRequests;
    if (hideOnlineStatus !== undefined) updateData.hideOnlineStatus = hideOnlineStatus;
    
    updateData.updatedAt = new Date();

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, authResult.user.id));

    return NextResponse.json({ 
      success: true,
      message: 'Privacy settings updated successfully' 
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}
