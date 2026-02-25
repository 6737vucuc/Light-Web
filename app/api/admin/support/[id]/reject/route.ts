import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ticketId = parseInt(params.id);

    // Delete the support ticket permanently from the database
    await db.delete(supportTickets).where(eq(supportTickets.id, ticketId));

    return NextResponse.json({ message: 'Testimony rejected and deleted permanently' });
  } catch (error) {
    console.error('Error rejecting testimony:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
