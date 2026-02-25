import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directMessages } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { RealtimeChatService, ChatEvent } from '@/lib/realtime/chat';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { checkRateLimit, RateLimitConfigs, getClientIdentifier } from '@/lib/security/rate-limit';
import { detectVPN, getClientIP, shouldBlockIP } from '@/lib/security/vpn-detection';
import { ThreatDetection } from '@/lib/security/threat-detection';
import { InputValidator } from '@/lib/security/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. RATE LIMITING - Strict for direct messages
    const clientIdentifier = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIdentifier, RateLimitConfigs.API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many messages. Please wait before sending another message.' }, 
        { status: 429 }
      );
    }

    // 2. VPN DETECTION
    const clientIP = getClientIP(request);
    const vpnDetection = await detectVPN(clientIP);
    if (vpnDetection.isSuspicious && shouldBlockIP(vpnDetection)) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'vpn_direct_message',
        severity: 'medium',
        description: `VPN/Proxy direct message attempt`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json(
        { error: 'VPN/Proxy connections are not allowed for sending direct messages.' }, 
        { status: 403 }
      );
    }

    // 3. THREAT DETECTION - Check for bot-like behavior
    const userAgent = request.headers.get('user-agent') || '';
    if (ThreatDetection.detectBot(userAgent, {})) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'bot_direct_message',
        severity: 'low',
        description: `Bot-like direct message activity detected`,
        timestamp: new Date(),
        blocked: false,
      });
    }

    const body = await request.json();
    const { recipientId, content, messageType = 'text', tempId } = body;

    // 4. INPUT VALIDATION
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (!InputValidator.isValidContent(content, 5000)) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
    }

    if (InputValidator.containsMaliciousPattern(content)) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'malicious_direct_message',
        severity: 'high',
        description: `Malicious pattern detected in direct message`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json({ error: 'Message contains invalid content' }, { status: 400 });
    }

    // 5. Validate recipient ID
    if (!recipientId || isNaN(parseInt(recipientId))) {
      return NextResponse.json({ error: 'Invalid recipient ID' }, { status: 400 });
    }

    // 6. Prevent self-messaging
    if (parseInt(recipientId) === user.userId) {
      return NextResponse.json({ error: 'Cannot send message to yourself' }, { status: 400 });
    }

    // 7. Verify recipient exists and is not banned
    const recipient = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, parseInt(recipientId))
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    if (recipient.isBanned) {
      return NextResponse.json({ error: 'Cannot send message to banned user' }, { status: 403 });
    }

    const [newMessage] = await db.insert(directMessages).values({
      senderId: user.userId,
      recipientId: parseInt(recipientId),
      content: content.trim(),
      messageType,
      isRead: false,
    }).returning();

    const supabaseAdmin = getSupabaseAdmin();
    
    const messagePayload = {
      id: newMessage.id,
      clientId: tempId,
      senderId: user.userId,
      senderName: user.name,
      senderAvatar: user.avatar,
      content: newMessage.content,
      messageType: newMessage.messageType,
      timestamp: newMessage.createdAt,
      createdAt: newMessage.createdAt,
      isRead: false,
    };

    // 1. Broadcast to the private chat channel (for the active conversation)
    const chatChannelId = RealtimeChatService.getPrivateChannelName(user.userId, parseInt(recipientId));
    await supabaseAdmin.channel(chatChannelId).send({
      type: 'broadcast',
      event: ChatEvent.NEW_MESSAGE,
      payload: messagePayload,
    });

    // 2. Broadcast to the recipient's global notification channel (for background alerts)
    const notificationChannelName = `user-notifications:${recipientId}`;
    await supabaseAdmin.channel(notificationChannelName).send({
      type: 'broadcast',
      event: ChatEvent.NEW_MESSAGE,
      payload: messagePayload,
    });

    console.log('Direct message sent securely', {
      senderId: user.userId,
      recipientId: parseInt(recipientId),
      ip: clientIP
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
