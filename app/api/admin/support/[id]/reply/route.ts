import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Send reply to support ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ticketId = parseInt(id);
    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Reply message is required' },
        { status: 400 }
      );
    }

    // Get ticket and user info
    const ticket = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        subject: supportTickets.subject,
        message: supportTickets.message,
        type: supportTickets.category,
        createdAt: supportTickets.createdAt,
      })
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (ticket.length === 0) {
      return NextResponse.json(
        { error: 'Support ticket not found' },
        { status: 404 }
      );
    }

    const ticketData = ticket[0];

    // Get user email
    const userInfo = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, ticketData.userId))
      .limit(1);

    if (userInfo.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userEmail = userInfo[0].email;
    const userName = userInfo[0].name;

    // Send email reply
    try {
      // Use Vercel environment variables: EMAIL_USER and EMAIL_PASS
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || process.env.GMAIL_USER,
          pass: process.env.EMAIL_PASS || process.env.GMAIL_PASSWORD,
        },
      });

      const emailContent = `
        <h2>Support Request Reply</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for contacting Light Web Support. Here is our response to your request:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Original Request:</h3>
          <p><strong>Type:</strong> ${ticketData.type}</p>
          <p><strong>Subject:</strong> ${ticketData.subject}</p>
          <p><strong>Message:</strong></p>
          <p>${ticketData.message}</p>
        </div>

        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>Our Reply:</h3>
          <p>${message}</p>
        </div>

        <p>Best regards,<br>Light Web Support Team</p>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER || process.env.GMAIL_USER,
        to: userEmail,
        subject: `Re: ${ticketData.subject}`,
        html: emailContent,
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue even if email fails
    }

    // Update ticket status to resolved
    await db
      .update(supportTickets)
      .set({ 
        status: 'resolved',
        updatedAt: new Date() 
      })
      .where(eq(supportTickets.id, ticketId));

    return NextResponse.json({
      message: 'Reply sent successfully',
      ticketId,
    });
  } catch (error) {
    console.error('Send reply error:', error);
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}
