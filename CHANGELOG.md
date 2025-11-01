# Changelog - November 2025

## Version 3.0.0 - Performance & Features Update

### 🗑️ Removed Features

#### Voice Calling System
- **Reason**: Performance optimization and load reduction
- **Removed Components**:
  - `lib/calls/voice.ts` - Voice call service
  - `lib/webrtc/` - WebRTC configuration and hooks
  - `app/api/webrtc/` - WebRTC API endpoints
  - `components/messages/VoiceCall.tsx` - Voice call UI component
  - Audio files: `ringing.mp3`, `incoming-call.wav`, `ringing.wav`

- **Removed Dependencies**:
  - `peerjs` - Peer-to-peer connections
  - `livekit-client` - LiveKit client SDK
  - `livekit-server-sdk` - LiveKit server SDK
  - `ws` - WebSocket library
  - `@types/peerjs` - TypeScript definitions
  - `@types/ws` - TypeScript definitions

- **Updated Files**:
  - `components/community/Messenger.tsx` - Removed voice call button and modal
  - `package.json` - Removed voice calling dependencies
  - `FINAL_FEATURES.md` - Marked voice calling as removed

### ✨ Enhanced Features

#### Instagram-Style Stories System
- **New Features**:
  - ✅ Circular story avatars with gradient rings for unviewed stories
  - ✅ Automatic story progression with progress bars
  - ✅ Tap to pause/resume stories
  - ✅ Swipe left/right navigation between stories
  - ✅ Story grouping by user
  - ✅ Reply to stories via direct message
  - ✅ View story viewers list (for your own stories)
  - ✅ Delete your own stories
  - ✅ Upload photos and videos with captions
  - ✅ Full-screen story viewer with smooth transitions
  - ✅ Story expiration after 24 hours
  - ✅ View count tracking

- **New API Endpoints**:
  - `GET /api/stories/[storyId]/viewers` - Get list of story viewers
  - `POST /api/stories/[storyId]/view` - Record story view

- **Database Changes**:
  - Added `story_views` table for tracking viewers
  - Added `caption` column to `stories` table
  - Added indexes for better query performance

- **UI/UX Improvements**:
  - Instagram-like circular story avatars
  - Gradient ring for unviewed stories (yellow → pink → purple)
  - Gray ring for viewed stories
  - Smooth progress bars at the top
  - Tap left/right to navigate
  - Hold to pause
  - Swipe gestures support
  - Reply input at the bottom
  - Viewers modal for story owners
  - Delete button for story owners

### 📊 Performance Improvements

- **Reduced Bundle Size**: Removed ~2MB of WebRTC-related dependencies
- **Faster Load Times**: Eliminated unnecessary WebSocket connections
- **Better Mobile Performance**: Removed heavy peer-to-peer connection logic
- **Optimized Stories**: Added database indexes for faster queries

### 🔧 Technical Details

**Stories Component** (`components/community/Stories.tsx`):
- Complete rewrite with Instagram-style UI
- Story grouping by user
- Auto-progression with configurable duration
- Pause/resume on tap
- Navigation buttons for better UX
- Reply functionality integrated
- Viewers list for story owners

**Stories API** (`app/api/stories/`):
- Enhanced GET endpoint with user grouping
- View tracking with unique constraint
- Viewers list endpoint with authorization
- Caption support in story creation

**Database Schema**:
```sql
CREATE TABLE story_views (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id),
  user_id INTEGER REFERENCES users(id),
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE stories ADD COLUMN caption TEXT;
```

### 📝 Migration Guide

**For Developers**:
1. Run database migration: `pnpm drizzle-kit push`
2. Remove old dependencies: `pnpm install`
3. Test stories functionality
4. Update any custom integrations

**For Users**:
- Voice calling feature is no longer available
- Use Instagram-style stories for sharing moments
- Stories expire after 24 hours automatically
- Reply to stories via direct messages

### 🎯 Next Steps

- [ ] Add story reactions (like, heart, etc.)
- [ ] Add story highlights (save stories permanently)
- [ ] Add story filters and effects
- [ ] Add story mentions and hashtags
- [ ] Add story music integration
- [ ] Add story polls and questions

---

**Date**: November 1, 2025  
**Version**: 3.0.0  
**Status**: ✅ Completed
