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
