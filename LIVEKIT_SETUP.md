# 🎥 LiveKit Integration Guide

## Overview
تم دمج **LiveKit Cloud** بنجاح في مشروع Light-Web للمكالمات الفيديو والبث المباشر!

---

## 📦 Packages Installed

```bash
npm install livekit-server-sdk livekit-client @livekit/components-react
```

### Dependencies:
- `livekit-server-sdk` - Server-side SDK for token generation
- `livekit-client` - Client-side SDK for WebRTC
- `@livekit/components-react` - Pre-built React components

---

## 🔑 Environment Variables

Add these to your `.env.local` file:

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### How to Get LiveKit Credentials:

1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Sign up or log in
3. Create a new project
4. Copy your API Key, API Secret, and WebSocket URL
5. Add them to your environment variables

---

## 🏗️ Architecture

### Backend (API Routes)

#### Token Generation
- `/api/calls/token` - Generate token for video/voice calls
- `/api/live/token` - Generate token for live streaming

#### Call Management
- `POST /api/calls` - Initiate a call
- `GET /api/calls` - Get active calls
- `PATCH /api/calls/[callId]` - Update call status
- `GET /api/calls/[callId]` - Get call details

#### Live Streaming
- `POST /api/live` - Start live stream
- `GET /api/live` - Get active streams
- `GET /api/live/[streamId]` - Get stream details
- `PATCH /api/live/[streamId]` - End stream
- `POST /api/live/[streamId]/join` - Join stream (viewer)
- `DELETE /api/live/[streamId]/join` - Leave stream

### Frontend (Components)

#### Video Calls
- `components/calls/VideoCall.tsx` - Video/voice call component
- `app/call/[callId]/page.tsx` - Call page

#### Live Streaming
- `components/live/LiveStreamBroadcaster.tsx` - Broadcaster component
- `components/live/LiveStreamViewer.tsx` - Viewer component
- `app/live/[streamId]/page.tsx` - Live stream page

---

## 🎯 Features

### Video Calls
✅ Video and voice calls  
✅ Screen sharing  
✅ Mute/unmute audio  
✅ Enable/disable video  
✅ Call duration tracking  
✅ Call history  

### Live Streaming
✅ Go live with video/audio  
✅ Private streams (followers only)  
✅ Public streams  
✅ Real-time viewer count  
✅ Live comments (via data channel)  
✅ Live reactions  
✅ Stream duration tracking  

---

## 📱 Usage Examples

### Starting a Video Call

```typescript
// 1. Initiate call
const response = await fetch('/api/calls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    receiverId: 123,
    callType: 'video' // or 'voice'
  })
});

const { call } = await response.json();

// 2. Navigate to call page
router.push(`/call/${call.id}`);
```

### Starting a Live Stream

```typescript
// 1. Start stream
const response = await fetch('/api/live', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Live Stream',
    description: 'Join me live!',
    isPrivate: false
  })
});

const { stream } = await response.json();

// 2. Navigate to stream page
router.push(`/live/${stream.id}`);
```

### Joining a Live Stream

```typescript
// Navigate to stream page
router.push(`/live/${streamId}`);

// The component will automatically:
// 1. Check if user is broadcaster or viewer
// 2. Generate appropriate token
// 3. Join the LiveKit room
```

---

## 🔧 Token Generation

### For Calls

```typescript
import { generateLiveKitToken } from '@/lib/livekit';

const token = await generateLiveKitToken(
  roomName,        // e.g., "call_123_456_1234567890"
  participantName, // User's display name
  participantIdentity, // Unique user ID
  metadata         // Optional metadata
);
```

### For Broadcasting

```typescript
import { generateBroadcastToken } from '@/lib/livekit';

const token = await generateBroadcastToken(
  roomName,            // e.g., "live_123_1234567890"
  broadcasterName,     // Broadcaster's display name
  broadcasterIdentity  // Unique broadcaster ID
);
```

### For Viewing

```typescript
import { generateViewerToken } from '@/lib/livekit';

const token = await generateViewerToken(
  roomName,        // Same as broadcaster's room
  viewerName,      // Viewer's display name
  viewerIdentity   // Unique viewer ID
);
```

---

## 🎨 UI Components

### VideoCall Component

```tsx
import VideoCall from '@/components/calls/VideoCall';

<VideoCall
  callId={123}
  callType="video"
  onEndCall={() => router.push('/messages')}
/>
```

### LiveStreamBroadcaster Component

```tsx
import LiveStreamBroadcaster from '@/components/live/LiveStreamBroadcaster';

<LiveStreamBroadcaster
  streamId={123}
  onEndStream={() => router.push('/community')}
/>
```

### LiveStreamViewer Component

```tsx
import LiveStreamViewer from '@/components/live/LiveStreamViewer';

<LiveStreamViewer
  streamId={123}
  streamTitle="My Stream"
  broadcasterName="John Doe"
  broadcasterAvatar="/avatar.jpg"
  onLeave={() => router.push('/community')}
/>
```

---

## 🔒 Security & Privacy

### Call Privacy
- ✅ Only participants can join calls
- ✅ Blocked users cannot call
- ✅ JWT authentication required

### Stream Privacy
- ✅ Private streams: Only followers can view
- ✅ Public streams: Anyone can view
- ✅ Only stream owner can broadcast
- ✅ Viewer count tracking

### Token Security
- ✅ Tokens generated server-side only
- ✅ Short-lived tokens (24 hours default)
- ✅ Room-specific permissions
- ✅ Identity verification

---

## 📊 LiveKit Room Permissions

### Broadcaster
```typescript
{
  roomJoin: true,
  room: roomName,
  canPublish: true,      // Can publish video/audio
  canSubscribe: true,    // Can receive video/audio
  canPublishData: true,  // Can send messages
  roomAdmin: true        // Can manage room
}
```

### Viewer
```typescript
{
  roomJoin: true,
  room: roomName,
  canPublish: false,     // Cannot publish video/audio
  canSubscribe: true,    // Can receive video/audio
  canPublishData: true   // Can send messages/reactions
}
```

### Call Participant
```typescript
{
  roomJoin: true,
  room: roomName,
  canPublish: true,      // Can publish video/audio
  canSubscribe: true,    // Can receive video/audio
  canPublishData: true   // Can send messages
}
```

---

## 🚀 Deployment

### Vercel Environment Variables

Add these in your Vercel project settings:

```
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### LiveKit Cloud Setup

1. Create account at [cloud.livekit.io](https://cloud.livekit.io/)
2. Create a new project
3. Copy credentials
4. Add to environment variables
5. Deploy!

---

## 🎯 Next Steps

### Optional Enhancements

1. **Recording**
   - Enable recording in LiveKit dashboard
   - Store recordings in S3/Cloud Storage
   - Add playback UI

2. **Transcription**
   - Enable real-time transcription
   - Add closed captions

3. **Analytics**
   - Track call duration
   - Monitor stream quality
   - Viewer engagement metrics

4. **Advanced Features**
   - Virtual backgrounds
   - Noise cancellation
   - Beauty filters
   - Screen sharing with audio

---

## 📚 Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit React Components](https://docs.livekit.io/guides/react-components/)
- [LiveKit Cloud](https://cloud.livekit.io/)
- [LiveKit GitHub](https://github.com/livekit)

---

## 🐛 Troubleshooting

### Token Generation Fails
- Check API key and secret are correct
- Verify environment variables are set
- Check LiveKit project is active

### Cannot Join Room
- Verify LIVEKIT_URL is correct
- Check token is not expired
- Ensure room name matches

### No Video/Audio
- Check browser permissions
- Verify camera/microphone access
- Test on different browser

### Poor Quality
- Check internet connection
- Reduce video quality in settings
- Use wired connection if possible

---

## ✅ Testing Checklist

- [ ] Video calls work
- [ ] Voice calls work
- [ ] Screen sharing works
- [ ] Live streaming works (broadcaster)
- [ ] Live streaming works (viewer)
- [ ] Viewer count updates
- [ ] Call duration tracked
- [ ] Stream duration tracked
- [ ] Private streams restricted
- [ ] Blocked users cannot call

---

**Version**: 1.0.0  
**Last Updated**: November 2, 2025  
**LiveKit Version**: Latest

🎉 **LiveKit Integration Complete!**
