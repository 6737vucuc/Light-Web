import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testimonies } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all testimonies (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allTestimonies = await db.query.testimonies.findMany({
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: (testimonies, { desc }) => [desc(testimonies.createdAt)],
    });

    // Format the response to match the expected structure
    const formattedTestimonies = allTestimonies.map((testimony: any) => ({
      id: testimony.id,
      userId: testimony.userId,
      userName: testimony.user?.name || 'Unknown User',
      userEmail: testimony.user?.email || '',
      content: testimony.content,
      isApproved: testimony.isApproved,
      createdAt: testimony.createdAt,
      updatedAt: testimony.updatedAt,
    }));

    return NextResponse.json({ testimonies: formattedTestimonies });
  } catch (error) {
    console.error('Get testimonies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonies' },
      { status: 500 }
    );
  }
}
