import { pgTable, text, timestamp, boolean, integer, serial, varchar, jsonb, date } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  birthDate: date('birth_date'),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  religion: varchar('religion', { length: 100 }),
  gender: varchar('gender', { length: 10 }),
  country: varchar('country', { length: 100 }),
  avatar: text('avatar'),
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

// Lessons table
export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Daily verses table
export const dailyVerses = pgTable('daily_verses', {
  id: serial('id').primaryKey(),
  verse: text('verse').notNull(),
  reference: varchar('reference', { length: 255 }).notNull(),
  imageUrl: text('image_url'),
  scheduledDate: timestamp('scheduled_date').notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Support requests table
export const supportRequests = pgTable('support_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(), // 'technical', 'testimony', 'prayer'
  subject: varchar('subject', { length: 255 }),
  message: text('message').notNull(),
  status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'approved', 'rejected'
  createdAt: timestamp('created_at').defaultNow(),
});

// Testimonies table
export const testimonies = pgTable('testimonies', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  content: text('content').notNull(),
  status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'approved', 'rejected'
  createdAt: timestamp('created_at').defaultNow(),
});

// Posts table
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  likesCount: integer('likes_count').default(0),
  commentsCount: integer('comments_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Likes table
export const likes = pgTable('likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  postId: integer('post_id').references(() => posts.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Comments table
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  postId: integer('post_id').references(() => posts.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Friendships table
export const friendships = pgTable('friendships', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  friendId: integer('friend_id').references(() => users.id),
  status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp('created_at').defaultNow(),
});

// Messages table
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id),
  receiverId: integer('receiver_id').references(() => users.id),
  content: text('content').notNull(),
  encryptedContent: text('encrypted_content'),
  isEncrypted: boolean('is_encrypted').default(true),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  deletedBySender: boolean('deleted_by_sender').default(false),
  deletedByReceiver: boolean('deleted_by_receiver').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Group chat messages table
export const groupMessages = pgTable('group_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  content: text('content').notNull(),
  encryptedContent: text('encrypted_content'),
  isEncrypted: boolean('is_encrypted').default(true),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// VPN detection logs
export const vpnLogs = pgTable('vpn_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  isVpn: boolean('is_vpn').default(false),
  vpnData: jsonb('vpn_data'),
  createdAt: timestamp('created_at').defaultNow(),
});



// Encryption keys table
export const encryptionKeys = pgTable('encryption_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  publicKey: text('public_key').notNull(),
  encryptedPrivateKey: text('encrypted_private_key').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Blocked users table
export const blockedUsers = pgTable('blocked_users', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  blockedUserId: integer('blocked_user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Reports table
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  reporterId: integer('reporter_id').references(() => users.id).notNull(),
  reportedUserId: integer('reported_user_id').references(() => users.id),
  reportedPostId: integer('reported_post_id').references(() => posts.id),
  reason: varchar('reason', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'reviewed', 'resolved'
  createdAt: timestamp('created_at').defaultNow(),
});

