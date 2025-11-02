# Instagram-Style Updates for Light-Web Community

## Overview
This document outlines the major updates made to the Public section of Light-Web to implement Instagram-style features while maintaining the existing group chat functionality.

## Database Changes

### 1. Users Table Updates
- **Added `username` field**: Unique username for each user (e.g., @username)
- **Added `usernameLastChanged` field**: Tracks when username was last changed (30-day restriction)
- **Added Instagram-style stats**: `postsCount`, `followersCount`, `followingCount`
- **Added privacy settings**: `isPrivate`, `hideFollowers`, `hideFollowing`, `allowComments`, `allowMessages`

### 2. New Tables Added
- **`savedPosts`**: For saving posts (Instagram-style bookmarks)
- **`postTags`**: For tagging users in posts
- **`messageReactions`**: For emoji reactions on messages
- **`typingIndicators`**: For real-time typing indicators in DMs

### 3. Removed Tables
Removed unnecessary tables to focus on community features:
- `lessons` and `lessonProgress` (moved to main profile section)
- `dailyVerses`
- `testimonies`
- `supportRequests`

## New Features

### 1. Instagram-Style Profile Page (`/user-profile/[userId]`)

**Key Features:**
- Clean Instagram-like design with grid layout for posts
- Username display with @ symbol
- Stats display: Posts, Followers, Following
- Follow/Unfollow button with pending request support
- Private account support with lock icon
- Three tabs: Posts, Saved (own profile only), Tagged
- Privacy toggle (Public/Private account)
- Direct message button
- Bio and website link display

**Privacy Features:**
- Private accounts require follow approval
- Hide followers/following lists option
- Control who can comment and message
- Blocked users cannot view profile

### 2. Instagram-Style Direct Messaging (`/messages`)

**Key Features:**
- Two-column layout: Conversations list + Chat window
- Search conversations by name or username
- Real-time messaging with Pusher
- Typing indicators
- Read receipts (single check / double check)
- Message reactions (emoji)
- Send images and text
- Delete messages
- Online status indicators
- Clean, minimal design matching Instagram DM

**Technical Implementation:**
- Pusher for real-time updates
- Optimistic UI updates
- Message encryption support (existing)
- Conversation pinning and muting

### 3. Username System

**Features:**
- Unique username for each user
- Username displayed in profile and messages
- Search by username
- 30-day restriction on username changes
- Auto-generated default usernames (user_[id])

## File Structure

### New Files Created
```
app/
├── user-profile/[userId]/page.tsx (Updated)
├── messages/page.tsx (Updated)
└── api/
    ├── follow/
    │   ├── [userId]/route.ts (Existing)
    │   └── status/[userId]/route.ts (New)
    ├── posts/
    │   ├── saved/route.ts (New)
    │   └── tagged/[userId]/route.ts (New)
    └── users/
        └── update-privacy/route.ts (New)

components/
└── community/
    └── MessengerInstagram.tsx (New)

lib/
└── db/
    └── schema.ts (Updated)

drizzle/
└── 0004_add_username.sql (New migration)
```

### Backup Files
- `app/user-profile/[userId]/page-old.tsx`
- `app/messages/page-old.tsx`
- `lib/db/schema-backup.ts`

## Separation of Concerns

### Main Profile (`/profile`)
- Personal settings and preferences
- Lesson progress tracking
- Account management
- Email and password changes
- Two-factor authentication

### Community Profile (`/user-profile/[userId]`)
- Public-facing Instagram-style profile
- Social interactions (follow, message)
- Posts, stories, and tags
- Privacy settings for social features

## Group Chat Preservation

The existing group chat functionality has been **fully preserved**:
- `/community` page still has "Group Chat" and "Public" tabs
- `GroupChat.tsx` component remains unchanged
- All group chat APIs remain functional
- No changes to group messaging system

## API Endpoints

### New Endpoints
- `GET /api/follow/status/[userId]` - Check follow status
- `POST /api/users/update-privacy` - Update privacy settings
- `GET /api/posts/saved` - Get saved posts
- `POST /api/posts/saved` - Save/unsave a post
- `GET /api/posts/tagged/[userId]` - Get tagged posts

### Updated Endpoints
- `/api/users/[userId]` - Now includes username and privacy info
- `/api/messages` - Enhanced with reactions and typing indicators

## Migration Instructions

### 1. Database Migration
```bash
# Run the migration to add username field
psql -d your_database -f drizzle/0004_add_username.sql
```

### 2. Update Existing Users
All existing users will get auto-generated usernames in format `user_[id]`. Users should be prompted to set their custom username on first login after update.

### 3. Environment Variables
Ensure these are set:
- `NEXT_PUBLIC_PUSHER_APP_KEY`
- `NEXT_PUBLIC_PUSHER_CLUSTER`
- `DATABASE_URL`

## Testing Checklist

- [ ] Username creation and validation
- [ ] Username change restriction (30 days)
- [ ] Follow/unfollow functionality
- [ ] Private account follow requests
- [ ] Profile privacy settings
- [ ] Direct messaging
- [ ] Message reactions
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Saved posts
- [ ] Tagged posts
- [ ] Group chat (verify unchanged)

## Future Enhancements

Potential features for future updates:
- Story highlights
- Post carousel (multiple images)
- Video posts
- Voice messages in DM
- Video calls
- Message forwarding
- Group DMs
- Post insights/analytics
- Verified badges

## Notes

- All changes are backward compatible
- Existing posts and messages are preserved
- Group chat functionality remains completely unchanged
- Profile page separation ensures clean distinction between personal and social features
- Username system includes validation and uniqueness checks
