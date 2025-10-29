# Voice Call Feature Update - LiveKit Integration

## 🎉 What's New

تم تحديث نظام المكالمات الصوتية بالكامل لاستخدام **LiveKit** بدلاً من Pusher + WebRTC المخصص.

### ✅ Improvements

1. **أداء أفضل**: LiveKit مُحسّن خصيصاً للمكالمات الصوتية والفيديو
2. **توافق مع Vercel**: يعمل بشكل مثالي على المنصات Serverless
3. **جودة صوت محسّنة**: 
   - Echo cancellation (إلغاء الصدى)
   - Noise suppression (تقليل الضوضاء)
   - Auto gain control (التحكم التلقائي في مستوى الصوت)
4. **موثوقية أعلى**: اتصال أكثر استقراراً وأقل انقطاعاً
5. **مجاني**: 10,000 دقيقة شهرياً مجاناً على LiveKit Cloud

## 📁 Files Changed

### New Files
- `lib/webrtc/livekit-config.ts` - إعدادات LiveKit
- `lib/webrtc/useVoiceCall.ts` - Hook جديد للمكالمات الصوتية
- `app/api/webrtc/token/route.ts` - API لإنشاء tokens
- `app/api/webrtc/incoming-calls/route.ts` - API للتحقق من المكالمات الواردة
- `LIVEKIT_SETUP.md` - دليل الإعداد الكامل
- `ENV_VARIABLES_LIVEKIT.txt` - متغيرات البيئة المطلوبة
- `.env.example` - مثال لملف البيئة

### Updated Files
- `components/community/FriendsMessaging.tsx` - تحديث لاستخدام LiveKit
- `app/api/webrtc/call/route.ts` - تبسيط API المكالمات
- `package.json` - إضافة حزم LiveKit

### Deleted Files
- `lib/webrtc/useWebRTC-pusher.ts` - ❌ تم الحذف
- `lib/webrtc/pusher-signaling.ts` - ❌ تم الحذف
- `app/api/pusher/auth/route.ts` - ❌ تم الحذف

## 🚀 Deployment Steps

### 1. Get LiveKit Credentials

```bash
# 1. Go to https://cloud.livekit.io/
# 2. Sign up for free account
# 3. Create a new project
# 4. Copy your credentials from Settings > Keys
```

### 2. Set Environment Variables in Vercel

```bash
# Go to Vercel Dashboard > Your Project > Settings > Environment Variables
# Add these variables:

NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### 3. Deploy to Vercel

```bash
# Option 1: Using Vercel CLI
vercel --prod

# Option 2: Push to GitHub (if connected to Vercel)
git add .
git commit -m "Update voice calls to use LiveKit"
git push origin main
```

### 4. Test the Feature

1. Open your deployed app
2. Login with two different accounts (in different browsers)
3. Add each other as friends
4. Go to Community > Friends & Messaging
5. Select a friend and click the phone icon
6. Accept the call on the other device
7. Enjoy crystal-clear voice calls! 🎙️

## 🔧 Local Development

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create `.env.local`

```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Other required variables
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
```

### 3. Run Development Server

```bash
pnpm dev
```

### 4. Test Locally

- Open http://localhost:3000 in two browsers
- Login with different accounts
- Test voice calls

## 📊 Features

### Current Features
✅ One-to-one voice calls  
✅ Incoming call notifications  
✅ Accept/Reject calls  
✅ Mute/Unmute microphone  
✅ Call duration timer  
✅ End call functionality  
✅ High-quality audio (echo cancellation, noise suppression)  

### Future Enhancements (Optional)
📹 Video calls  
👥 Group voice calls  
📱 Screen sharing  
💬 In-call chat  
📊 Call quality indicators  
📞 Call history  

## 🐛 Troubleshooting

### Issue: "Failed to get access token"
**Cause**: Missing or incorrect environment variables  
**Solution**: 
1. Check Vercel environment variables
2. Ensure all three LiveKit variables are set
3. Redeploy after adding variables

### Issue: "No audio during call"
**Cause**: Microphone permissions or browser compatibility  
**Solution**:
1. Allow microphone access in browser
2. Use Chrome, Firefox, or Safari (latest versions)
3. Check browser console for errors

### Issue: "Connection failed"
**Cause**: Incorrect LiveKit URL or network issues  
**Solution**:
1. Verify `NEXT_PUBLIC_LIVEKIT_URL` is correct
2. Check if LiveKit server is running (for self-hosted)
3. Ensure WebSocket connections are allowed

## 📚 Documentation

- **LiveKit Setup Guide**: See `LIVEKIT_SETUP.md`
- **Environment Variables**: See `ENV_VARIABLES_LIVEKIT.txt`
- **LiveKit Docs**: https://docs.livekit.io/
- **API Reference**: See comments in code files

## 💰 Cost

### LiveKit Cloud Free Tier
- ✅ 10,000 participant minutes/month
- ✅ Unlimited rooms
- ✅ No credit card required
- ✅ Perfect for small to medium apps

### Example Calculation
- Average call: 5 minutes
- Calls per month: 1,000
- Total: 5,000 minutes (within free tier ✅)

## 🔒 Security

- ✅ Tokens expire after 10 minutes
- ✅ Each call uses a unique room
- ✅ User authentication required
- ✅ HTTPS/WSS only in production
- ✅ API secrets never exposed to client

## 📞 Support

For issues or questions:
1. Check `LIVEKIT_SETUP.md` for detailed setup
2. Review browser console for errors
3. Check Vercel logs for server errors
4. Visit LiveKit Discord: https://livekit.io/discord

---

**Last Updated**: October 30, 2025  
**Version**: 2.0.0 (LiveKit)  
**Previous Version**: 1.0.0 (Pusher WebRTC)
