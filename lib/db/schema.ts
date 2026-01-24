import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, jsonb } from 'drizzle-orm/pg-core';

// Users table
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
  bannedReason: text('banned_reason'),
  emailVerified: boolean('email_verified').default(false),
  // Account security
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  lastFailedLogin: timestamp('last_failed_login'),
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
  joinedAt: timestamp('joined_at').defaultNow(),
});

// Group Messages table
export const groupMessages = pgTable('group_messages', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => communityGroups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content'),
  imageUrl: text('image_url'),
  type: varchar('type', { length: 20 }).default('text'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

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
  status: varchar('status', { length: 20 }).default('pending'), // pending, reviewed, resolved
  adminNotes: text('admin_notes'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// SUPPORT SYSTEM
// ========================================

// Support tickets table
export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // technical, account, content, other
  status: varchar('status', { length: 20 }).default('open'), // open, in_progress, resolved, closed
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  assignedTo: integer('assigned_to').references(() => users.id),
  adminResponse: text('admin_response'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Support ticket replies
export const supportReplies = pgTable('support_replies', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => supportTickets.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// DAILY VERSES SYSTEM
// ========================================

// Daily verses table
export const dailyVerses = pgTable('daily_verses', {
  id: serial('id').primaryKey(),
  verseText: text('verse_text').notNull(),
  verseReference: varchar('verse_reference', { length: 255 }).notNull(), // e.g., "القرآن الكريم - سورة البقرة: 255"
  language: varchar('language', { length: 10 }).default('ar'),
  religion: varchar('religion', { length: 50 }).notNull(), // islam, christianity, etc.
  displayDate: date('display_date').notNull(),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
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
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
  religion: varchar('religion', { length: 50 }).notNull(), // islam, christianity, etc.
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ========================================
// LESSON PROGRESS TRACKING
// ========================================

// Lesson progress table
export const lessonProgress = pgTable('lesson_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  lessonId: varchar('lesson_id', { length: 100 }).notNull(), // lesson identifier
  lessonTitle: varchar('lesson_title', { length: 255 }).notNull(),
  completed: boolean('completed').default(false),
  progress: integer('progress').default(0), // percentage 0-100
  lastAccessedAt: timestamp('last_accessed_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});


// ========================================
// PASSWORD RESET
// ========================================
// Password resets table
export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
