import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  avatar: text('avatar'),
  coverPhoto: text('cover_photo'),
  bio: text('bio'),
  gender: varchar('gender', { length: 10 }),
  country: varchar('country', { length: 100 }),
  religion: varchar('religion', { length: 100 }),
  birthDate: date('birth_date'),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  // Status
  isAdmin: boolean('is_admin').default(false),
  isBanned: boolean('is_banned').default(false),
  bannedUntil: timestamp('banned_until'),
  bannedReason: text('banned_reason'),
  emailVerified: boolean('email_verified').default(false),
  // Account security
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  lastFailedLogin: timestamp('last_failed_login'),
  lastSeen: timestamp('last_seen').defaultNow(),
  isOnline: boolean('is_online').default(false),
  // OAuth Fields
  googleId: varchar('google_id', { length: 255 }).unique(),
  authProvider: varchar('auth_provider', { length: 50 }).default('credentials'),
  emailVerifiedAt: timestamp('email_verified_at'),
  oauthData: jsonb('oauth_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Email verification codes
export const verificationCodes = pgTable('verification_codes', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Support Tickets table
export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('open'), // 'open', 'in-progress', 'resolved', 'closed'
  priority: varchar('priority', { length: 20 }).default('normal'), // 'low', 'normal', 'high'
  assignedTo: integer('assigned_to'),
  adminResponse: text('admin_response'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Support Replies table
export const supportReplies = pgTable('support_replies', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => supportTickets.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Password Resets table
export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Daily Verses table (using name from API imports)
export const dailyVerses = pgTable('daily_verses', {
  id: serial('id').primaryKey(),
  verseText: text('verse_text').notNull(),
  verseReference: varchar('verse_reference', { length: 255 }).notNull(),
  language: varchar('language', { length: 10 }).default('ar'),
  religion: varchar('religion', { length: 50 }).notNull(),
  displayDate: date('display_date').notNull(),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// COMMUNITY GROUPS (NEW SYSTEM)
// ========================================

// Community Groups table
export const communityGroups = pgTable('community_groups', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#8B5CF6'),
  icon: varchar('icon', { length: 50 }).default('users'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  membersCount: integer('members_count').default(0),
  messagesCount: integer('messages_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Group Members table
export const groupMembers = pgTable('group_members', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => communityGroups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 20 }).default('member'),
  isAdmin: boolean('is_admin').default(false),
  isModerator: boolean('is_moderator').default(false),
  canDeleteMessages: boolean('can_delete_messages').default(false),
  mutedUntil: timestamp('muted_until'),
  joinedAt: timestamp('joined_at').defaultNow(),
  lastActive: timestamp('last_active').defaultNow(),
});

// Group Messages table
export const groupMessages = pgTable('group_messages', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => communityGroups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content'),
  mediaUrl: text('media_url'),
  messageType: varchar('message_type', { length: 20 }).default('text'),
  isEdited: boolean('is_edited').default(false),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  replyToId: integer('reply_to_id').references((): any => groupMessages.id),
  reactionsCount: integer('reactions_count').default(0),
  isEncrypted: boolean('is_encrypted').default(false),
  isPinned: boolean('is_pinned').default(false),
  pinnedAt: timestamp('pinned_at'),
  pinnedBy: integer('pinned_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Pinned Messages table
export const pinnedMessages = pgTable('pinned_messages', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => communityGroups.id).notNull(),
  messageId: integer('message_id').references(() => groupMessages.id).notNull(),
  pinnedBy: integer('pinned_by').references(() => users.id),
  pinnedAt: timestamp('pinned_at').defaultNow(),
});

// Starred Messages table
export const starredMessages = pgTable('starred_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  messageId: integer('message_id').references(() => groupMessages.id).notNull(),
  starredAt: timestamp('starred_at').defaultNow(),
});

// Message Mentions table
export const messageMentions = pgTable('message_mentions', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').references(() => groupMessages.id).notNull(),
  mentionedUserId: integer('mentioned_user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Member Presence table
export const memberPresence = pgTable('member_presence', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => communityGroups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen').defaultNow(),
  sessionId: varchar('session_id', { length: 255 }),
});

// Group Activity Log table
export const groupActivityLog = pgTable('group_activity_log', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => communityGroups.id).notNull(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Group Message Read Receipts table
export const groupMessageReadReceipts = pgTable('group_message_read_receipts', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').references(() => groupMessages.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  readAt: timestamp('read_at').defaultNow(),
});

// ========================================
// RELATIONS
// ========================================

export const usersRelations = relations(users, ({ many }) => ({
  groupMemberships: many(groupMembers),
  groupMessages: many(groupMessages),
  pinnedMessages: many(pinnedMessages),
  starredMessages: many(starredMessages),
  mentions: many(messageMentions),
  presence: many(memberPresence),
  activityLogs: many(groupActivityLog),
  readReceipts: many(groupMessageReadReceipts),
  supportTickets: many(supportTickets),
}));

export const communityGroupsRelations = relations(communityGroups, ({ many }) => ({
  members: many(groupMembers),
  messages: many(groupMessages),
  pinnedMessages: many(pinnedMessages),
  presence: many(memberPresence),
  activityLogs: many(groupActivityLog),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(communityGroups, {
    fields: [groupMembers.groupId],
    references: [communityGroups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const groupMessagesRelations = relations(groupMessages, ({ one, many }) => ({
  group: one(communityGroups, {
    fields: [groupMessages.groupId],
    references: [communityGroups.id],
  }),
  user: one(users, {
    fields: [groupMessages.userId],
    references: [users.id],
  }),
  parentMessage: one(groupMessages, {
    fields: [groupMessages.replyToId],
    references: [groupMessages.id],
    relationName: 'messageReplies',
  }),
  childReplies: many(groupMessages, {
    relationName: 'messageReplies',
  }),
  pinnedIn: many(pinnedMessages),
  starredBy: many(starredMessages),
  mentions: many(messageMentions),
  readBy: many(groupMessageReadReceipts),
}));

export const pinnedMessagesRelations = relations(pinnedMessages, ({ one }) => ({
  group: one(communityGroups, {
    fields: [pinnedMessages.groupId],
    references: [communityGroups.id],
  }),
  message: one(groupMessages, {
    fields: [pinnedMessages.messageId],
    references: [groupMessages.id],
  }),
  pinnedBy: one(users, {
    fields: [pinnedMessages.pinnedBy],
    references: [users.id],
  }),
}));

export const starredMessagesRelations = relations(starredMessages, ({ one }) => ({
  user: one(users, {
    fields: [starredMessages.userId],
    references: [users.id],
  }),
  message: one(groupMessages, {
    fields: [starredMessages.messageId],
    references: [groupMessages.id],
  }),
}));

export const messageMentionsRelations = relations(messageMentions, ({ one }) => ({
  message: one(groupMessages, {
    fields: [messageMentions.messageId],
    references: [groupMessages.id],
  }),
  mentionedUser: one(users, {
    fields: [messageMentions.mentionedUserId],
    references: [users.id],
  }),
}));

export const memberPresenceRelations = relations(memberPresence, ({ one }) => ({
  group: one(communityGroups, {
    fields: [memberPresence.groupId],
    references: [communityGroups.id],
  }),
  user: one(users, {
    fields: [memberPresence.userId],
    references: [users.id],
  }),
}));

export const groupActivityLogRelations = relations(groupActivityLog, ({ one }) => ({
  group: one(communityGroups, {
    fields: [groupActivityLog.groupId],
    references: [communityGroups.id],
  }),
  user: one(users, {
    fields: [groupActivityLog.userId],
    references: [users.id],
  }),
}));

export const groupMessageReadReceiptsRelations = relations(groupMessageReadReceipts, ({ one }) => ({
  message: one(groupMessages, {
    fields: [groupMessageReadReceipts.messageId],
    references: [groupMessages.id],
  }),
  user: one(users, {
    fields: [groupMessageReadReceipts.userId],
    references: [users.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
  replies: many(supportReplies),
}));

export const supportRepliesRelations = relations(supportReplies, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportReplies.ticketId],
    references: [supportTickets.id],
  }),
  user: one(users, {
    fields: [supportReplies.userId],
    references: [users.id],
  }),
}));

// ========================================
// REPORTS SYSTEM
// ========================================

// Reports table for inappropriate messages
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  reporterId: integer('reporter_id').references(() => users.id).notNull(),
  reportedUserId: integer('reported_user_id').references(() => users.id).notNull(),
  messageId: integer('message_id').references(() => groupMessages.id),
  groupId: integer('group_id').references(() => communityGroups.id),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'resolved', 'dismissed'
  adminNotes: text('admin_notes'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// LESSONS SYSTEM
// ========================================

// Lessons table
export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  imageurl: text('imageurl'),
  videourl: text('videourl'),
  religion: varchar('religion', { length: 50 }).notNull(), // 'christianity', 'islam', 'judaism', 'all'
  createdby: integer('createdby').references(() => users.id).notNull(),
  createdat: timestamp('createdat').defaultNow(),
  updatedat: timestamp('updatedat').defaultNow(),
});

// Lesson Progress table
export const lessonProgress = pgTable('lesson_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  lessonId: integer('lesson_id').references(() => lessons.id).notNull(),
  completed: boolean('completed').default(false),
  progress: integer('progress').default(0),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Lesson Ratings table
export const lessonRatings = pgTable('lesson_ratings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  lessonId: integer('lesson_id').references(() => lessons.id).notNull(),
  rating: integer('rating').notNull(), // 1 to 5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ========================================
// DIRECT MESSAGES SYSTEM
// ========================================

// Direct messages table
export const directMessages = pgTable('direct_messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  receiverId: integer('receiver_id').references(() => users.id).notNull(),
  content: text('content'),
  messageType: varchar('message_type', { length: 20 }).default('text'),
  mediaUrl: text('media_url'),
  isEncrypted: boolean('is_encrypted').default(true),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Calls table
export const calls = pgTable('calls', {
  id: serial('id').primaryKey(),
  callerId: integer('caller_id').references(() => users.id).notNull(),
  receiverId: integer('receiver_id').references(() => users.id).notNull(),
  callerPeerId: varchar('caller_peer_id', { length: 255 }),
  receiverPeerId: varchar('receiver_peer_id', { length: 255 }),
  status: varchar('status', { length: 50 }).default('ringing'), // 'ringing', 'connected', 'ended', 'rejected'
  callType: varchar('call_type', { length: 20 }).default('voice'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  duration: integer('duration').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// TESTIMONIES SYSTEM
// ========================================

// Testimonies table
export const testimonies = pgTable('testimonies', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  religion: varchar('religion', { length: 50 }).notNull(),
  isApproved: boolean('is_approved').default(false),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ========================================
// VPN LOGS SYSTEM
// ========================================

// VPN Logs table
export const vpnLogs = pgTable('vpn_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  country: varchar('country', { length: 100 }),
  countryCode: varchar('country_code', { length: 10 }),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),
  isp: varchar('isp', { length: 255 }),
  organization: varchar('organization', { length: 255 }),
  asn: varchar('asn', { length: 50 }),
  isVPN: boolean('is_vpn').default(false),
  isTor: boolean('is_tor').default(false),
  isProxy: boolean('is_proxy').default(false),
  isHosting: boolean('is_hosting').default(false),
  isAnonymous: boolean('is_anonymous').default(false),
  riskScore: integer('risk_score').default(0),
  threatLevel: varchar('threat_level', { length: 20 }).default('low'),
  detectionService: varchar('detection_service', { length: 50 }),
  detectionData: text('detection_data'),
  isBlocked: boolean('is_blocked').default(false),
  blockReason: text('block_reason'),
  userAgent: text('user_agent'),
  requestPath: varchar('request_path', { length: 500 }),
  requestMethod: varchar('request_method', { length: 10 }),
  detectedAt: timestamp('detected_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// GROUP MESSAGE PINNED (ALIAS)
// ========================================

// Group Message Pinned table (alias for pinnedMessages for compatibility)
export const groupMessagePinned = pgTable('group_message_pinned', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => communityGroups.id).notNull(),
  messageId: integer('message_id').references(() => groupMessages.id).notNull(),
  pinnedBy: integer('pinned_by').references(() => users.id),
  pinnedAt: timestamp('pinned_at').defaultNow(),
});

// Relations for groupMessagePinned
export const groupMessagePinnedRelations = relations(groupMessagePinned, ({ one }) => ({
  group: one(communityGroups, {
    fields: [groupMessagePinned.groupId],
    references: [communityGroups.id],
  }),
  message: one(groupMessages, {
    fields: [groupMessagePinned.messageId],
    references: [groupMessages.id],
  }),
  pinnedByUser: one(users, {
    fields: [groupMessagePinned.pinnedBy],
    references: [users.id],
  }),
}));

// Verses table for Daily Verses (compatibility alias)
export const verses = pgTable('verses', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  reference: varchar('reference', { length: 255 }),
  religion: varchar('religion', { length: 50 }).default('all'),
  createdAt: timestamp('createdat').defaultNow(),
  updatedAt: timestamp('updatedat').defaultNow(),
});

// NextAuth.js OAuth accounts table
// Removed circular export causing build error
