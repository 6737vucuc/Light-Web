import { pgTable, text, timestamp, boolean, integer, serial, varchar, jsonb, date } from 'drizzle-orm/pg-core';

// Users table - keeping existing structure
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  usernameLastChanged: timestamp('username_last_changed'),
  password: text('password').notNull(),
  avatar: text('avatar'),
  coverPhoto: text('cover_photo'),
  bio: text('bio'),
  website: varchar('website', { length: 255 }),
  gender: varchar('gender', { length: 10 }),
  country: varchar('country', { length: 100 }),
  religion: varchar('religion', { length: 100 }),
  birthDate: date('birth_date'),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  location: varchar('location', { length: 255 }),
  work: varchar('work', { length: 255 }),
  education: varchar('education', { length: 255 }),
  relationshipStatus: varchar('relationship_status', { length: 50 }),
  // Privacy settings
  isPrivate: boolean('is_private').default(false),
  hideFollowers: boolean('hide_followers').default(false),
  hideFollowing: boolean('hide_following').default(false),
  allowComments: varchar('allow_comments', { length: 20 }).default('everyone'),
  allowMessages: varchar('allow_messages', { length: 20 }).default('everyone'),
  privacyPosts: varchar('privacy_posts', { length: 20 }).default('everyone'),
  privacyFriendsList: varchar('privacy_friends_list', { length: 20 }).default('everyone'),
  privacyProfile: varchar('privacy_profile', { length: 20 }).default('everyone'),
  privacyPhotos: varchar('privacy_photos', { length: 20 }).default('everyone'),
  privacyMessages: varchar('privacy_messages', { length: 20 }).default('everyone'),
  privacyFriendRequests: varchar('privacy_friend_requests', { length: 20 }).default('everyone'),
  hideOnlineStatus: boolean('hide_online_status').default(false),
  // Status
  isAdmin: boolean('is_admin').default(false),
  isBanned: boolean('is_banned').default(false),
  bannedUntil: timestamp('banned_until'),
  emailVerified: boolean('email_verified').default(false),
  lastSeen: timestamp('last_seen').defaultNow(),
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

// ========================================
// COMMUNITY GROUPS - New Group Chat System
// ========================================

// Community Groups table
export const communityGroups = pgTable('community_groups', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  avatar: text('avatar'),
  coverImage: text('cover_image'),
  color: varchar('color', { length: 20 }).default('#8B5CF6'), // Purple default
  icon: varchar('icon', { length: 50 }).default('users'), // Lucide icon name
  membersCount: integer('members_count').default(0),
  messagesCount: integer('messages_count').default(0),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Group Members table
export const groupMembers = pgTable('group_members', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => communityGroups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 20 }).default('member'), // 'admin', 'moderator', 'member'
  joinedAt: timestamp('joined_at').defaultNow(),
  lastReadAt: timestamp('last_read_at').defaultNow(),
});

// Group Messages table
export const groupMessages = pgTable('group_messages', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => communityGroups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content'),
  messageType: varchar('message_type', { length: 20 }).default('text'), // 'text', 'image', 'video', 'audio', 'file'
  mediaUrl: text('media_url'),
  replyToId: integer('reply_to_id'), // For replying to messages
  isEdited: boolean('is_edited').default(false),
  isDeleted: boolean('is_deleted').default(false),
  reactionsCount: integer('reactions_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Message Reactions table
export const messageReactions = pgTable('message_reactions', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').references(() => groupMessages.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  reaction: varchar('reaction', { length: 10 }).notNull(), // emoji
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// PRIVATE MESSAGING - Keeping existing
// ========================================

// Conversations table
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  user1Id: integer('user1_id').references(() => users.id).notNull(),
  user2Id: integer('user2_id').references(() => users.id).notNull(),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Private Messages table
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  receiverId: integer('receiver_id').references(() => users.id).notNull(),
  content: text('content'),
  messageType: varchar('message_type', { length: 20 }).default('text'),
  mediaUrl: text('media_url'),
  isRead: boolean('is_read').default(false),
  isDelivered: boolean('is_delivered').default(false),
  readAt: timestamp('read_at'),
  deliveredAt: timestamp('delivered_at'),
  isDeleted: boolean('is_deleted').default(false),
  deletedFor: varchar('deleted_for', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// FOLLOWS - Keeping existing
// ========================================

export const follows = pgTable('follows', {
  id: serial('id').primaryKey(),
  followerId: integer('follower_id').references(() => users.id).notNull(),
  followingId: integer('following_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// NOTIFICATIONS - Keeping existing
// ========================================

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  content: text('content').notNull(),
  relatedUserId: integer('related_user_id').references(() => users.id),
  relatedItemId: integer('related_item_id'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// ADMIN & SUPPORT - Keeping existing
// ========================================

// Admin Lessons table
export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }),
  order: integer('order').default(0),
  isPublished: boolean('is_published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Daily Verses table
export const verses = pgTable('verses', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  reference: varchar('reference', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Support Tickets table
export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).default('open'),
  priority: varchar('priority', { length: 20 }).default('normal'),
  adminResponse: text('admin_response'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Testimonies table
export const testimonies = pgTable('testimonies', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  isApproved: boolean('is_approved').default(false),
  isPublished: boolean('is_published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Reports table
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  reporterId: integer('reporter_id').references(() => users.id).notNull(),
  reportedUserId: integer('reported_user_id').references(() => users.id),
  reportedItemId: integer('reported_item_id'),
  reportedItemType: varchar('reported_item_type', { length: 50 }),
  reason: varchar('reason', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('pending'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// VPN Logs table
export const vpnLogs = pgTable('vpn_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  isVpn: boolean('is_vpn').default(false),
  vpnDetails: jsonb('vpn_details'),
  action: varchar('action', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Two-Factor Authentication table
export const twoFactorAuth = pgTable('two_factor_auth', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  secret: text('secret').notNull(),
  enabled: boolean('enabled').default(false),
  backupCodes: jsonb('backup_codes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Blocked Users table
export const blockedUsers = pgTable('blocked_users', {
  id: serial('id').primaryKey(),
  blockerId: integer('blocker_id').references(() => users.id).notNull(),
  blockedId: integer('blocked_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Daily Verses table
export const dailyVerses = pgTable('daily_verses', {
  id: serial('id').primaryKey(),
  verseId: integer('verse_id').references(() => verses.id).notNull(),
  date: date('date').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Encryption Keys table
export const encryptionKeys = pgTable('encryption_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  publicKey: text('public_key').notNull(),
  privateKeyEncrypted: text('private_key_encrypted').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Lesson Progress table
export const lessonProgress = pgTable('lesson_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  lessonId: integer('lesson_id').references(() => lessons.id).notNull(),
  status: varchar('status', { length: 20 }).default('not_started'),
  progressPercentage: integer('progress_percentage').default(0),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User Privacy Settings table
export const userPrivacySettings = pgTable('user_privacy_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  profileVisibility: varchar('profile_visibility', { length: 20 }).default('public'),
  showEmail: boolean('show_email').default(false),
  showBirthDate: boolean('show_birth_date').default(false),
  allowMessages: varchar('allow_messages', { length: 20 }).default('everyone'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Typing Indicators table
export const typingIndicators = pgTable('typing_indicators', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  conversationId: integer('conversation_id').references(() => conversations.id).notNull(),
  isTyping: boolean('is_typing').default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Support Requests table
export const supportRequests = pgTable('support_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).default('open'),
  priority: varchar('priority', { length: 20 }).default('normal'),
  adminResponse: text('admin_response'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
