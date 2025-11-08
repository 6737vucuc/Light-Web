export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';
import { RealtimeChatService } from '@/lib/realtime/chat';

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
      firstName,
      lastName,
      bio,
      location,
      work,
      education,
      website,
      relationshipStatus,
      birthDate,
      gender,
      country
    } = body;

    // Update user profile
    const [updatedUser] = await db
      .update(users)
      .set({
        firstName: firstName || null,
        lastName: lastName || null,
        bio: bio || null,
        location: location || null,
        work: work || null,
        education: education || null,
        website: website || null,
        relationshipStatus: relationshipStatus || null,
        birthDate: birthDate || null,
        gender: gender || null,
        country: country || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authResult.user.id))
      .returning();

    // Send real-time update if name changed
    if (firstName || lastName) {
      const fullName = `${firstName || ''} ${lastName || ''}`.trim();
      if (fullName) {
        await RealtimeChatService.sendProfileUpdate(authResult.user.id, {
          name: fullName,
          updatedAt: new Date(),
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
