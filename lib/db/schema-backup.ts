import { pgTable, text, timestamp, boolean, integer, serial, varchar, jsonb, date } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  birthDate: date('birth_date'),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  usernameLastChanged: timestamp('username_last_changed'),
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
  // Instagram-style stats
  postsCount: integer('posts_count').default(0),
  followersCount: integer('followers_count').default(0),
  followingCount: integer('following_count').default(0),
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

// Conversations table - Instagram-style DMs
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  participant1Id: integer('participant1_id').references(() => users.id).notNull(),
  participant2Id: integer('participant2_id').references(() => users.id).notNull(),
  lastMessageId: integer('last_message_id'),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  isPinned1: boolean('is_pinned_1').default(false), // Pinned for participant 1
  isPinned2: boolean('is_pinned_2').default(false), // Pinned for participant 2
  isMuted1: boolean('is_muted_1').default(false),
  isMuted2: boolean('is_muted_2').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Messages table - Instagram-style messages
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id).notNull(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  receiverId: integer('receiver_id').references(() => users.id).notNull(),
  messageType: varchar('message_type', { length: 20 }).default('text'), // 'text', 'image', 'video', 'voice', 'post', 'story'
  content: text('content'), // Text content
  mediaUrl: text('media_url'), // Image/video/voice URL
  postId: integer('post_id').references(() => posts.id), // Shared post
  replyToId: integer('reply_to_id'), // Reply to message ID
  encryptedContent: text('encrypted_content'),
  isEncrypted: boolean('is_encrypted').default(true),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  deletedBySender: boolean('deleted_by_sender').default(false),
  deletedByReceiver: boolean('deleted_by_receiver').default(false),
  isTemporary: boolean('is_temporary').default(false), // Disappearing message
  expiresAt: timestamp('expires_at'), // For temporary messages
  reaction: varchar('reaction', { length: 10 }), // Emoji reaction
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Message reactions table
export const messageReactions = pgTable('message_reactions', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').references(() => messages.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  reaction: varchar('reaction', { length: 10 }).notNull(), // '❤️', '😂', '😮', '😢', '😡', '👍'
  createdAt: timestamp('created_at').defaultNow(),
});

// Typing indicators table
export const typingIndicators = pgTable('typing_indicators', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  isTyping: boolean('is_typing').default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Follows table - Instagram-style following system
export const follows = pgTable('follows', {
  id: serial('id').primaryKey(),
  followerId: integer('follower_id').references(() => users.id).notNull(), // User who follows
  followingId: integer('following_id').references(() => users.id).notNull(), // User being followed
  status: varchar('status', { length: 20 }).default('accepted'), // 'pending' or 'accepted'
  createdAt: timestamp('created_at').defaultNow(),
});

// User privacy settings - Instagram-style privacy
export const userPrivacySettings = pgTable('user_privacy_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  isPrivate: boolean('is_private').default(false), // Private account
  hideFollowers: boolean('hide_followers').default(false),
  hideFollowing: boolean('hide_following').default(false),
  allowTagging: varchar('allow_tagging', { length: 20 }).default('everyone'), // 'everyone', 'followers', 'nobody'
  allowComments: varchar('allow_comments', { length: 20 }).default('everyone'),
  allowMessages: varchar('allow_messages', { length: 20 }).default('everyone'),
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

