import { pgTable, text, timestamp, boolean, integer, serial, varchar, jsonb, date } from 'drizzle-orm/pg-core';

// Users table - Instagram-style
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
  // Instagram-style stats
  postsCount: integer('posts_count').default(0),
  followersCount: integer('followers_count').default(0),
  followingCount: integer('following_count').default(0),
  // Privacy settings
  isPrivate: boolean('is_private').default(false),
  hideFollowers: boolean('hide_followers').default(false),
  hideFollowing: boolean('hide_following').default(false),
  allowComments: varchar('allow_comments', { length: 20 }).default('everyone'), // 'everyone', 'followers', 'nobody'
  allowMessages: varchar('allow_messages', { length: 20 }).default('everyone'),
  // Status
  isAdmin: boolean('is_admin').default(false),
  isBanned: boolean('is_banned').default(false),
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

// Posts table - Instagram-style
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content'),
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
  mediaType: varchar('media_type', { length: 20 }).default('text'), // 'text', 'image', 'video', 'carousel'
  likesCount: integer('likes_count').default(0),
  commentsCount: integer('comments_count').default(0),
  sharesCount: integer('shares_count').default(0),
  privacy: varchar('privacy', { length: 20 }).default('public'), // 'public', 'followers', 'private'
  location: varchar('location', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Likes table
export const likes = pgTable('likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  postId: integer('post_id').references(() => posts.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Comments table
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  postId: integer('post_id').references(() => posts.id).notNull(),
  content: text('content').notNull(),
  likesCount: integer('likes_count').default(0),
  repliesCount: integer('replies_count').default(0),
  parentCommentId: integer('parent_comment_id'), // For nested replies
  createdAt: timestamp('created_at').defaultNow(),
});

// Comment likes table
export const commentLikes = pgTable('comment_likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  commentId: integer('comment_id').references(() => comments.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Follows table - Instagram-style following system
export const follows = pgTable('follows', {
  id: serial('id').primaryKey(),
  followerId: integer('follower_id').references(() => users.id).notNull(), // User who follows
  followingId: integer('following_id').references(() => users.id).notNull(), // User being followed
  status: varchar('status', { length: 20 }).default('accepted'), // 'pending' or 'accepted' (for private accounts)
  createdAt: timestamp('created_at').defaultNow(),
});

// Stories table - Instagram-style
export const stories = pgTable('stories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  mediaUrl: text('media_url').notNull(),
  mediaType: varchar('media_type', { length: 20 }).notNull(), // 'image' or 'video'
  caption: text('caption'),
  viewsCount: integer('views_count').default(0),
  expiresAt: timestamp('expires_at').notNull(), // 24 hours from creation
  createdAt: timestamp('created_at').defaultNow(),
});

// Story views table
export const storyViews = pgTable('story_views', {
  id: serial('id').primaryKey(),
  storyId: integer('story_id').references(() => stories.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  viewedAt: timestamp('viewed_at').defaultNow(),
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

// Messages table - Instagram-style DMs
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id).notNull(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  receiverId: integer('receiver_id').references(() => users.id).notNull(),
  messageType: varchar('message_type', { length: 20 }).default('text'), // 'text', 'image', 'video', 'voice', 'post'
  content: text('content'), // Text content
  mediaUrl: text('media_url'), // Image/video/voice URL
  postId: integer('post_id').references(() => posts.id), // Shared post
  replyToId: integer('reply_to_id'), // Reply to message ID
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  deletedBySender: boolean('deleted_by_sender').default(false),
  deletedByReceiver: boolean('deleted_by_receiver').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Message reactions table - Instagram-style reactions
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

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'like', 'comment', 'follow', 'mention', 'message'
  fromUserId: integer('from_user_id').references(() => users.id).notNull(),
  postId: integer('post_id').references(() => posts.id),
  commentId: integer('comment_id').references(() => comments.id),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
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
  reportedCommentId: integer('reported_comment_id').references(() => comments.id),
  reason: varchar('reason', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'reviewed', 'resolved'
  createdAt: timestamp('created_at').defaultNow(),
});

// Saved posts table - Instagram-style saved posts
export const savedPosts = pgTable('saved_posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  postId: integer('post_id').references(() => posts.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Post tags table - Instagram-style tagging
export const postTags = pgTable('post_tags', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').references(() => posts.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(), // Tagged user
  createdAt: timestamp('created_at').defaultNow(),
});

// Group chats table - للدردشة الجماعية
export const groupChats = pgTable('group_chats', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  avatar: text('avatar'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Group chat members table
export const groupChatMembers = pgTable('group_chat_members', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groupChats.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 20 }).default('member'), // 'admin', 'member'
  joinedAt: timestamp('joined_at').defaultNow(),
});

// Group chat messages table
export const groupChatMessages = pgTable('group_chat_messages', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groupChats.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  mediaUrl: text('media_url'),
  messageType: varchar('message_type', { length: 20 }).default('text'), // 'text', 'image', 'video'
  createdAt: timestamp('created_at').defaultNow(),
});
