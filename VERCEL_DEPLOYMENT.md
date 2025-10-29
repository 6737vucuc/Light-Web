# Vercel Deployment Guide - LiveKit Voice Calls

## 📋 Prerequisites

✅ LiveKit credentials (already configured)  
✅ Vercel account  
✅ GitHub repository  

## 🚀 Quick Deployment Steps

### Step 1: Add Environment Variables to Vercel

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your project (or import from GitHub)

2. **Navigate to Settings**
   - Click on "Settings" tab
   - Click on "Environment Variables" in the sidebar

3. **Add LiveKit Variables**

   Add these **three** environment variables:

   **Variable 1:**
   ```
   Name: NEXT_PUBLIC_LIVEKIT_URL
   Value: wss://light-of-life-hmc6y7lv.livekit.cloud
   Environments: ✅ Production ✅ Preview ✅ Development
   ```

   **Variable 2:**
   ```
   Name: LIVEKIT_API_KEY
   Value: APIKpzsAfMt3dqH
   Environments: ✅ Production ✅ Preview ✅ Development
   ```

   **Variable 3:**
   ```
   Name: LIVEKIT_API_SECRET
   Value: cvNeyXRTJZH1pnDnCXeYfDXrr2VIN8VbO1UKHOnTofkD
   Environments: ✅ Production ✅ Preview ✅ Development
   ```

4. **Add Other Required Variables**

   You'll also need to add your existing environment variables:
   - `DATABASE_URL` - Your Neon database connection string
   - `JWT_SECRET` - Your JWT secret key
   - `PUSHER_*` variables (if using Pusher for other features)
   - `EMAIL_*` variables (for email functionality)

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Option B: Using GitHub Integration

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Add LiveKit voice calls"
   git push origin main
   ```

2. Vercel will automatically deploy if connected to your GitHub repo

#### Option C: Manual Deployment

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure environment variables
4. Click "Deploy"

### Step 3: Verify Deployment

1. **Check Build Logs**
   - Go to Vercel Dashboard > Deployments
   - Click on the latest deployment
   - Check that build completed successfully

2. **Test Voice Calls**
   - Open your deployed app
   - Login with two different accounts (in different browsers/devices)
   - Add each other as friends
   - Go to Community > Friends & Messaging
   - Click the phone icon to start a call
   - Accept the call on the other device

## 🔧 Troubleshooting

### Issue: Build Failed

**Check:**
1. All environment variables are set correctly
2. No syntax errors in code
3. Dependencies are installed (check package.json)

**Solution:**
```bash
# Redeploy with verbose logging
vercel --prod --debug
```

### Issue: Voice Calls Not Working

**Check:**
1. Environment variables are set in Vercel
2. Browser has microphone permissions
3. Using HTTPS (required for WebRTC)
4. Check browser console for errors

**Solution:**
1. Go to Vercel Dashboard > Settings > Environment Variables
2. Verify all three LiveKit variables are present
3. Redeploy after adding variables

### Issue: "Failed to get access token"

**Cause:** Missing or incorrect LiveKit credentials

**Solution:**
1. Double-check environment variables in Vercel
2. Ensure no extra spaces in values
3. Redeploy after fixing

## 📊 Monitoring

### Check Call Quality

1. **LiveKit Dashboard**
   - Go to https://cloud.livekit.io/
   - View active rooms and participants
   - Monitor call quality metrics

2. **Vercel Logs**
   - Go to Vercel Dashboard > Deployments > Functions
   - Check `/api/webrtc/token` logs
   - Check `/api/webrtc/call` logs

## 🔒 Security Checklist

✅ Environment variables are set in Vercel (not hardcoded)  
✅ API Secret is never exposed to client  
✅ HTTPS is enabled (automatic on Vercel)  
✅ User authentication is required for calls  
✅ Tokens expire after 10 minutes  

## 💰 Cost Estimation

### Vercel
- **Free Tier**: Sufficient for most apps
- **Pro**: $20/month (if needed for more bandwidth)

### LiveKit Cloud
- **Free Tier**: 10,000 participant minutes/month
- **Starter**: $99/month for 50,000 minutes
- **Current Usage**: Within free tier ✅

### Example Monthly Cost
- Vercel: $0 (Free tier)
- LiveKit: $0 (Free tier)
- **Total: $0/month** 🎉

## 📱 Testing Checklist

After deployment, test these scenarios:

- [ ] User can start a voice call
- [ ] Incoming call notification appears
- [ ] User can accept incoming call
- [ ] User can reject incoming call
- [ ] Audio is clear (no echo, no noise)
- [ ] Mute/unmute works correctly
- [ ] Call duration timer is accurate
- [ ] End call works properly
- [ ] Multiple calls can be made sequentially
- [ ] Calls work on mobile browsers

## 🎯 Next Steps

1. **Deploy to Production**
   ```bash
   vercel --prod
   ```

2. **Test Voice Calls**
   - Test with real users
   - Monitor LiveKit dashboard
   - Check Vercel logs

3. **Optional Enhancements**
   - Add video calls
   - Add group calls
   - Add call history
   - Add call quality indicators

## 📞 Support

If you encounter issues:

1. **Check Documentation**
   - `LIVEKIT_SETUP.md` - Complete setup guide
   - `VOICE_CALL_UPDATE.md` - Feature documentation

2. **Check Logs**
   - Vercel Dashboard > Deployments > Functions
   - Browser Console (F12)
   - LiveKit Dashboard

3. **Common Issues**
   - Missing environment variables → Add in Vercel Settings
   - Build errors → Check syntax and dependencies
   - Call quality issues → Check network and browser

---

**Your LiveKit Credentials:**
- URL: `wss://light-of-life-hmc6y7lv.livekit.cloud`
- API Key: `APIKpzsAfMt3dqH`
- API Secret: `cvNeyXRTJZH1pnDnCXeYfDXrr2VIN8VbO1UKHOnTofkD`

**Important:** Keep API Secret confidential! Never commit to Git.
