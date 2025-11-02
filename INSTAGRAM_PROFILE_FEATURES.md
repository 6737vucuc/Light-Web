# Instagram Profile Features - Implementation Plan

## 1. Database Schema Updates

### New Tables:

#### `follows` table
- id (primary key)
- followerId (user who follows)
- followingId (user being followed)
- status (pending/accepted) - for private accounts
- createdAt

#### `blocks` table
- id (primary key)
- blockerId (user who blocks)
- blockedId (user being blocked)
- createdAt

#### `user_privacy_settings` table
- userId (primary key)
- isPrivate (boolean) - private/public account
- hideFollowers (boolean)
- hideFollowing (boolean)
- allowTagging (enum: everyone/followers/nobody)
- allowComments (enum: everyone/followers/nobody)

### Updates to `users` table:
- bio (text)
- website (string)
- coverImage (string)
- postsCount (integer)
- followersCount (integer)
- followingCount (integer)

---

## 2. API Endpoints

### Profile APIs:
- GET `/api/profile/[username]` - Get user profile
- PUT `/api/profile/update` - Update own profile
- GET `/api/profile/[username]/posts` - Get user posts

### Follow APIs:
- POST `/api/follow/[userId]` - Follow user
- DELETE `/api/follow/[userId]` - Unfollow user
- GET `/api/follow/followers/[userId]` - Get followers list
- GET `/api/follow/following/[userId]` - Get following list
- GET `/api/follow/requests` - Get pending follow requests
- POST `/api/follow/requests/[requestId]/accept` - Accept request
- POST `/api/follow/requests/[requestId]/reject` - Reject request

### Privacy APIs:
- PUT `/api/privacy/settings` - Update privacy settings
- POST `/api/privacy/block/[userId]` - Block user
- DELETE `/api/privacy/block/[userId]` - Unblock user
- GET `/api/privacy/blocked` - Get blocked users list

---

## 3. Profile Page Features

### Header Section:
- Profile picture (circular, clickable for full view)
- Cover image (optional)
- Username
- Verified badge (if applicable)
- Edit Profile button (own profile)
- Follow/Unfollow button (other profiles)
- Message button
- More options menu (...)

### Stats Section:
- Posts count
- Followers count (clickable)
- Following count (clickable)
- Hide counts based on privacy settings

### Bio Section:
- Display name
- Bio text (with hashtags and mentions clickable)
- Website link
- Location (optional)

### Action Buttons:
- Follow/Following/Requested
- Message
- Email (if public)
- More options (Block, Report, Share)

### Content Tabs:
- Posts (grid view)
- Tagged (posts user is tagged in)
- Saved (only visible to owner)

### Privacy Features:
- Private account indicator (🔒)
- "This account is private" message
- Follow request button for private accounts
- Hidden content for non-followers

---

## 4. UI Components

### ProfileHeader Component:
- Avatar with upload functionality
- Cover image with upload
- Stats display
- Action buttons
- Bio section

### ProfileGrid Component:
- Responsive grid (3 columns on desktop, 2 on tablet, 1 on mobile)
- Post thumbnails
- Hover effects
- Like/comment counts overlay

### FollowButton Component:
- Dynamic states: Follow, Following, Requested, Pending
- Loading state
- Confirmation modal for unfollow

### PrivacySettings Component:
- Toggle switches
- Privacy level indicators
- Save/Cancel buttons

---

## 5. Privacy Logic

### Viewing Profile:
- Public account: Anyone can view
- Private account: Only followers can view posts
- Blocked users: Cannot view profile at all

### Following:
- Public account: Instant follow
- Private account: Send request, wait for approval
- Cannot follow if blocked

### Content Visibility:
- Public: All posts visible
- Private: Only followers see posts
- Blocked: No access to any content

---

## 6. Notifications

### Follow-related:
- New follower
- Follow request (private accounts)
- Follow request accepted
- Someone you follow posted

---

## Implementation Priority:
1. ✅ Database schema updates
2. ✅ Follow/Unfollow API
3. ✅ Profile API with privacy checks
4. ✅ Profile page UI
5. ✅ Privacy settings page
6. ✅ Block functionality
7. ✅ Follow requests system
