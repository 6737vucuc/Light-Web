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
  coverPhoto: text('cover_photo'),
  bio: text('bio'),
  location: varchar('location', { length: 255 }),
  work: varchar('work', { length: 255 }),
  education: varchar('education', { length: 255 }),
  website: varchar('website', { length: 255 }),
  relationshipStatus: varchar('relationship_status', { length: 50 }),
  privacyPosts: varchar('privacy_posts', { length: 20 }).default('public'),
  privacyFriendsList: varchar('privacy_friends_list', { length: 20 }).default('public'),
  privacyProfile: varchar('privacy_profile', { length: 20 }).default('public'),
  privacyPhotos: varchar('privacy_photos', { length: 20 }).default('public'),
  privacyMessages: varchar('privacy_messages', { length: 20 }).default('everyone'),
  privacyFriendRequests: varchar('privacy_friend_requests', { length: 20 }).default('everyone'),
  hideOnlineStatus: boolean('hide_online_status').default(false),
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
// Stories table
export const stories = pgTable('stories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  mediaUrl: text('media_url').notNull(),
  mediaType: varchar('media_type', { length: 20 }).notNull(), // 'image' or 'video'
  caption: text('caption'),
  viewsCount: integer('views_count').default(0),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Story views table
export const storyViews = pgTable('story_views', {
  id: serial('id').primaryKey(),
  storyId: integer('story_id').references(() => stories.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  viewedAt: timestamp('viewed_at').defaultNow(),
});

// Groups table
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  coverPhoto: text('cover_photo'),
  privacy: varchar('privacy', { length: 20 }).default('public'), // 'public', 'private'
  createdBy: integer('created_by').references(() => users.id).notNull(),
  membersCount: integer('members_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Group members table
export const groupMembers = pgTable('group_members', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 20 }).default('member'), // 'admin', 'moderator', 'member'
  joinedAt: timestamp('joined_at').defaultNow(),
});

// Group posts table
export const groupPosts = pgTable('group_posts', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  likesCount: integer('likes_count').default(0),
  commentsCount: integer('comments_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'like', 'comment', 'friend_request', etc.
  fromUserId: integer('from_user_id').references(() => users.id).notNull(),
  postId: integer('post_id').references(() => posts.id),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Lesson progress table
export const lessonProgress = pgTable('lesson_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  lessonId: integer('lesson_id').references(() => lessons.id).notNull(),
  completed: boolean('completed').default(false),
  progress: integer('progress').default(0), // 0-100
  lastWatchedAt: timestamp('last_watched_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

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

