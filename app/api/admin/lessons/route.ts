import { NextRequest, NextResponse } from 'next/server';
import { db, sql as rawSql } from '@/lib/db';
import { lessons } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all lessons (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allLessons = await rawSql`
      SELECT id, title, content, imageurl as "imageUrl", videourl as "videoUrl", religion, createdby as "createdBy", createdat as "createdAt", updatedat as "updatedAt"
      FROM lessons
      ORDER BY createdat DESC
    `;

    return NextResponse.json({ lessons: allLessons });
  } catch (error) {
    console.error('Get lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}

// Create new lesson (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, imageUrl, videoUrl, religion } = body;

    if (!title || !content || !religion) {
      return NextResponse.json(
        { error: 'Title, content, and religion are required' },
        { status: 400 }
      );
    }

    const result = await rawSql`
      INSERT INTO lessons (title, content, imageurl, videourl, religion, createdby, createdat, updatedat)
      VALUES (${title}, ${content}, ${imageUrl || null}, ${videoUrl || null}, ${religion}, ${user.userId}, NOW(), NOW())
      RETURNING *
    `;

    const lesson = result[0];

    if (!lesson) {
      throw new Error('Failed to insert lesson into database');
    }

    return NextResponse.json({
      message: 'Lesson created successfully',
      lesson,
    });
  } catch (error: any) {
    console.error('Create lesson error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lesson' },
      { status: 500 }
    );
  }
}

// Update lesson (admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, content, imageUrl, videoUrl, religion } = body;

    if (!id || !title || !content || !religion) {
      return NextResponse.json(
        { error: 'ID, title, content, and religion are required' },
        { status: 400 }
      );
    }

    const result = await rawSql`
      UPDATE lessons
      SET title = ${title}, content = ${content}, imageurl = ${imageUrl || null}, videourl = ${videoUrl || null}, religion = ${religion}, updatedat = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    const lesson = result[0];

    return NextResponse.json({
      message: 'Lesson updated successfully',
      lesson,
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson' },
      { status: 500 }
    );
  }
}

// Delete lesson (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    await rawSql`DELETE FROM lessons WHERE id = ${parseInt(id)}`;

    return NextResponse.json({
      message: 'Lesson deleted successfully',
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson' },
      { status: 500 }
    );
  }
}
