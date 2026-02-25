import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communityGroups } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { sql } from 'drizzle-orm';
import { checkRateLimit, RateLimitConfigs, getClientIdentifier } from '@/lib/security/rate-limit';
import { detectVPN, getClientIP, shouldBlockIP } from '@/lib/security/vpn-detection';
import { ThreatDetection } from '@/lib/security/threat-detection';
import { InputValidator } from '@/lib/security/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all groups with real member counts
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting for reading groups
    const clientIdentifier = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIdentifier, RateLimitConfigs.API);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Get all groups with real member counts and messages count in a single optimized query
    const groups = await db.execute(sql`
      SELECT 
        cg.*,
        (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = cg.id) as "membersCount",
        (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = cg.id) as "members_count",
        (SELECT COUNT(*)::int FROM group_messages gmsg WHERE gmsg.group_id = cg.id) as "messagesCount",
        (SELECT COUNT(*)::int FROM group_messages gmsg WHERE gmsg.group_id = cg.id) as "messages_count"
      FROM community_groups cg
      ORDER BY cg.created_at DESC
    `);

    // Normalize rows from db.execute result
    const normalizedGroups = Array.isArray(groups.rows) ? groups.rows : [];

    return NextResponse.json({ groups: normalizedGroups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new group (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. RATE LIMITING - Strict for group creation
    const clientIdentifier = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIdentifier, RateLimitConfigs.API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before creating another group.' }, 
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
        threatType: 'vpn_group_creation',
        severity: 'medium',
        description: `VPN/Proxy group creation attempt by admin ${user.userId}`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json(
        { error: 'VPN/Proxy connections are not allowed for creating groups.' }, 
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color, icon } = body;

    // 3. INPUT VALIDATION
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Group name must be between 2 and 100 characters' },
        { status: 400 }
      );
    }

    if (InputValidator.containsMaliciousPattern(name)) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'malicious_group_name',
        severity: 'medium',
        description: `Malicious pattern detected in group name`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json(
        { error: 'Group name contains invalid characters' },
        { status: 400 }
      );
    }

    if (description && InputValidator.containsMaliciousPattern(description)) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'malicious_group_description',
        severity: 'medium',
        description: `Malicious pattern detected in group description`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json(
        { error: 'Group description contains invalid content' },
        { status: 400 }
      );
    }

    // 4. THREAT DETECTION - Check for bot-like behavior
    const userAgent = request.headers.get('user-agent') || '';
    if (ThreatDetection.detectBot(userAgent, {})) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'bot_group_creation',
        severity: 'low',
        description: `Bot-like group creation activity detected`,
        timestamp: new Date(),
        blocked: false,
      });
    }

    const [group] = await db.insert(communityGroups).values({
      name: name.trim(),
      description: description ? description.trim() : null,
      color: color || '#8B5CF6',
      icon: icon || 'Users',
      createdBy: user.userId,
      membersCount: 0,
      messagesCount: 0,
    }).returning();

    console.log('Group created securely', {
      groupId: group.id,
      createdBy: user.userId,
      ip: clientIP
    });

    return NextResponse.json({
      message: 'Group created successfully',
      group,
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
