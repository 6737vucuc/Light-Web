import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encryptionKeys, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

// Get or create encryption keys for user
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const existingKeys = await db
      .select()
      .from(encryptionKeys)
      .where(eq(encryptionKeys.userId, authResult.user.id))
      .limit(1);

    if (existingKeys.length > 0) {
      return NextResponse.json({ keys: existingKeys[0] });
    }

    // No keys found - client should generate and POST them
    return NextResponse.json({ keys: null });
  } catch (error) {
    console.error('Get encryption keys error:', error);
    return NextResponse.json({ error: 'Failed to get keys' }, { status: 500 });
  }
}

// Store encryption keys
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { publicKey, encryptedPrivateKey } = await request.json();

    if (!publicKey || !encryptedPrivateKey) {
      return NextResponse.json({ error: 'Missing keys' }, { status: 400 });
    }

    // Check if keys already exist
    const existing = await db
      .select()
      .from(encryptionKeys)
      .where(eq(encryptionKeys.userId, authResult.user.id))
      .limit(1);

    if (existing.length > 0) {
      // Update existing keys
      await db
        .update(encryptionKeys)
        .set({
          publicKey,
          encryptedPrivateKey,
          updatedAt: new Date(),
        })
        .where(eq(encryptionKeys.userId, authResult.user.id));
    } else {
      // Insert new keys
      await db.insert(encryptionKeys).values({
        userId: authResult.user.id,
        publicKey,
        encryptedPrivateKey,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Store encryption keys error:', error);
    return NextResponse.json({ error: 'Failed to store keys' }, { status: 500 });
  }
}

