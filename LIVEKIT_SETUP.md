# LiveKit Setup Guide for Voice Calls

## Overview
This project now uses **LiveKit** for real-time voice calls, which works perfectly on Vercel and other serverless platforms.

## Why LiveKit?
- ✅ **Production-ready**: Built specifically for real-time audio/video
- ✅ **Serverless-friendly**: Works seamlessly on Vercel, Netlify, etc.
- ✅ **Scalable**: Handles thousands of concurrent calls
- ✅ **Low latency**: Optimized WebRTC implementation
- ✅ **Free tier**: 10,000 minutes/month free on LiveKit Cloud

## Setup Instructions

### Option 1: LiveKit Cloud (Recommended for Production)

1. **Create a LiveKit Cloud Account**
   - Go to https://cloud.livekit.io/
   - Sign up for a free account
   - Create a new project

2. **Get Your Credentials**
   - In your LiveKit Cloud dashboard, go to Settings
   - Copy the following values:
     - WebSocket URL (e.g., `wss://your-project.livekit.cloud`)
     - API Key
     - API Secret

3. **Add Environment Variables to Vercel**
   ```bash
   NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your-api-key
   LIVEKIT_API_SECRET=your-api-secret
   ```

4. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

### Option 2: Self-Hosted LiveKit (Advanced)

1. **Install LiveKit Server**
   ```bash
   docker run -d \
     --name livekit \
     -p 7880:7880 \
     -p 7881:7881 \
     -p 7882:7882/udp \
     -v $PWD/livekit.yaml:/livekit.yaml \
     livekit/livekit-server \
     --config /livekit.yaml
   ```

2. **Configure livekit.yaml**
   ```yaml
   port: 7880
   rtc:
     port_range_start: 50000
     port_range_end: 60000
     use_external_ip: true
   keys:
     your-api-key: your-api-secret
   ```

3. **Set Environment Variables**
   ```bash
   NEXT_PUBLIC_LIVEKIT_URL=ws://your-server-ip:7880
   LIVEKIT_API_KEY=your-api-key
   LIVEKIT_API_SECRET=your-api-secret
   ```

## Testing Locally

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Create `.env.local` file**
   ```env
   NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your-api-key
   LIVEKIT_API_SECRET=your-api-secret
   ```

3. **Run Development Server**
   ```bash
   pnpm dev
   ```

4. **Test Voice Calls**
   - Open http://localhost:3000 in two different browsers
   - Login with two different accounts
   - Add each other as friends
   - Start a voice call from the chat interface

## Features

### Current Implementation
- ✅ One-to-one voice calls
- ✅ Call notifications
- ✅ Accept/Reject incoming calls
- ✅ Mute/Unmute microphone
- ✅ Call duration timer
- ✅ End call functionality
- ✅ Audio quality optimization (echo cancellation, noise suppression)

### Future Enhancements (Optional)
- 📹 Video calls
- 👥 Group voice calls
- 📱 Screen sharing
- 💬 In-call chat
- 📊 Call quality indicators

## Troubleshooting

### Issue: "Failed to get access token"
**Solution**: Check that your environment variables are set correctly in Vercel.

### Issue: "No audio during call"
**Solution**: 
- Ensure microphone permissions are granted in browser
- Check browser console for errors
- Verify LiveKit server is running and accessible

### Issue: "Connection failed"
**Solution**:
- Verify NEXT_PUBLIC_LIVEKIT_URL is correct
- Check firewall settings (ports 7880-7882 for self-hosted)
- Ensure WebSocket connections are allowed

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   User A    │◄───────►│ LiveKit Room │◄───────►│   User B    │
│  (Browser)  │  WebRTC │   (Server)   │  WebRTC │  (Browser)  │
└─────────────┘         └──────────────┘         └─────────────┘
       │                       ▲                         │
       │                       │                         │
       │    ┌──────────────────┴──────────────────┐    │
       └───►│  Next.js API (Token Generation)     │◄───┘
            │  /api/webrtc/token                   │
            └──────────────────────────────────────┘
```

## API Endpoints

### POST `/api/webrtc/token`
Generate LiveKit access token for joining a room.

**Request:**
```json
{
  "roomName": "voice-call-1-2",
  "participantIdentity": "user-1-JohnDoe"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "url": "wss://your-project.livekit.cloud",
  "roomName": "voice-call-1-2",
  "participantIdentity": "user-1-JohnDoe"
}
```

### POST `/api/webrtc/call`
Manage call lifecycle (start, accept, reject, end).

**Actions:**
- `start`: Initiate a call
- `accept`: Accept incoming call
- `reject`: Reject incoming call
- `end`: End active call

### GET `/api/webrtc/call`
Check for incoming call notifications.

## Security Considerations

1. **Token Expiration**: Tokens expire after 10 minutes
2. **Room Isolation**: Each call uses a unique room name
3. **Authentication**: All endpoints require user authentication
4. **HTTPS Only**: WebRTC requires secure connections in production

## Cost Estimation

### LiveKit Cloud Free Tier
- 10,000 participant minutes/month
- Unlimited rooms
- No credit card required

### Example Usage
- Average call duration: 5 minutes
- Calls per month: 1,000
- Total minutes: 5,000 (within free tier)

## Support

For LiveKit-specific issues:
- Documentation: https://docs.livekit.io/
- Discord: https://livekit.io/discord
- GitHub: https://github.com/livekit/livekit

For project-specific issues:
- Check the browser console for errors
- Review server logs in Vercel dashboard
- Test with different browsers/devices
