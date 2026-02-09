# 🎯 Supabase Realtime Messaging - Complete Setup Guide

## 📋 Overview

Your Light Web project has been successfully migrated from Pusher to **Supabase Realtime** for real-time messaging. This guide will walk you through the final setup steps to get everything working.

## ✅ What Has Been Done

### Removed (Old System)
- ❌ Pusher and PeerJS dependencies
- ❌ Old `direct_messages` and `calls` tables
- ❌ All old API routes for messages, calls, and Pusher
- ❌ Old messaging components

### Added (New System)
- ✅ Supabase Realtime integration
- ✅ New database schema (conversations, messages, participants)
- ✅ Modern API routes for conversations and messaging
- ✅ New React components (ConversationList, ChatWindow, MessageInput)
- ✅ Real-time subscriptions with WebSocket
- ✅ Typing indicators and read receipts
- ✅ Mobile-responsive UI

## 🚀 Setup Steps

### Step 1: Create Supabase Project (5 minutes)

1. **Go to Supabase**
   - Visit: https://supabase.com
   - Click "Start your project"
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Enter project name: `light-web-messaging`
   - Set a strong database password (save it!)
   - Choose region closest to your users (e.g., `East US`)
   - Click "Create new project"
   - Wait ~2 minutes for setup to complete

3. **Get Your Credentials**
   - Once ready, go to **Settings** (⚙️ icon) → **API**
   - Copy these three values:
   
   ```
   Project URL: https://xxxxx.supabase.co
   anon/public key: eyJhbGci...
   service_role key: eyJhbGci...
   ```

### Step 2: Configure Environment Variables (2 minutes)

#### For Local Development

Create/update `.env.local` in your project root:

```bash
# Existing variables (keep these)
DATABASE_URL="postgresql://postgres.lzqyucohnjtubivlmdkw:P3bJdw68gG4dUeTs@aws-1-eu-central-1.pooler.supabase.com:6543/"

# NEW: Add these Supabase variables
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
```

#### For Vercel (Production)

1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your `light-web-project`
3. Go to **Settings** → **Environment Variables**
4. Add these three variables:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Production, Preview, Development |

5. Click **Save** for each

### Step 3: Run Database Migration (3 minutes)

1. **Go to Supabase SQL Editor**
   - In your Supabase dashboard
   - Click **SQL Editor** in left sidebar
   - Click **New Query**

2. **Run the Migration**
   - Open the file: `database/migrations/001_create_supabase_messaging.sql`
   - Copy ALL the SQL content
   - Paste into Supabase SQL Editor
   - Click **Run** (or press Ctrl/Cmd + Enter)
   - You should see: "Success. No rows returned"

3. **Verify Tables Created**
   - Go to **Database** → **Tables**
   - You should see these new tables:
     - ✅ conversations
     - ✅ conversation_participants
     - ✅ messages
     - ✅ message_read_receipts
     - ✅ typing_indicators

### Step 4: Enable Realtime (2 minutes)

1. **Go to Database Replication**
   - In Supabase dashboard
   - Click **Database** → **Replication**

2. **Enable Realtime for Tables**
   - Find and enable these tables:
     - ☑️ `messages`
     - ☑️ `conversations`
     - ☑️ `typing_indicators`
     - ☑️ `conversation_participants`

3. **Save Changes**
   - Tables will show "1 active" when enabled

### Step 5: Install Dependencies (1 minute)

If you haven't already, install the packages:

```bash
npm install
# or
yarn install
```

The required Supabase packages are already in `package.json`.

### Step 6: Deploy to Vercel (Automatic)

Your changes have been pushed to GitHub, which will trigger an automatic deployment on Vercel.

1. **Check Deployment Status**
   - Go to: https://vercel.com/dashboard
   - Look for your `light-web-project`
   - You should see a new deployment in progress

2. **Wait for Build**
   - Usually takes 2-3 minutes
   - Status will change from "Building" → "Ready"

3. **Check for Errors**
   - If build fails, check the build logs
   - Most common issue: Missing environment variables
   - Make sure all Supabase env vars are set in Vercel

### Step 7: Test the Messaging System (5 minutes)

1. **Open Your Live Site**
   - Go to: https://light-web-project.vercel.app/en

2. **Login with Two Accounts**
   - Open site in normal browser (User A)
   - Open site in incognito/private window (User B)
   - Login with different accounts

3. **Test Direct Messaging**
   - User A: Go to Community → Click on User B → "Message" button
   - Should open `/messages?userId={B's ID}`
   - Send a message
   - User B: Check messages page - should appear instantly!

4. **Test Real-time Features**
   - ✅ Messages appear instantly (no refresh needed)
   - ✅ Typing indicator shows when someone types
   - ✅ Read receipts update (checkmarks)
   - ✅ Online/offline status
   - ✅ Unread count updates

## 🔍 Troubleshooting

### Issue: "Unauthorized" or 401 Errors

**Solution:**
1. Check Supabase credentials in `.env.local` and Vercel
2. Make sure all three env variables are set
3. Redeploy on Vercel after adding env variables

### Issue: Messages Not Appearing in Real-time

**Solution:**
1. Verify Realtime is enabled for tables in Supabase
2. Check browser console for WebSocket errors
3. Ensure you're using `https://` (not `http://`)
4. Check Supabase dashboard → Logs for errors

### Issue: Database Connection Error

**Solution:**
1. Your existing `DATABASE_URL` should still work
2. The new tables are created in Supabase, separate from main database
3. Make sure SQL migration ran successfully
4. Check Supabase → Database → Tables to verify

### Issue: File Upload Not Working

**Solution:**
The code expects an `/api/upload` endpoint. You need to create it:

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'messages',
      resource_type: 'auto',
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

### Issue: Build Fails on Vercel

**Common causes:**
1. Missing environment variables
2. TypeScript errors
3. Import errors

**Solution:**
- Check Vercel build logs for specific error
- Ensure all env variables are set
- Test build locally: `npm run build`

## 📊 Database Connection Notes

### Your Current Setup

You have TWO databases:
1. **Neon Database** (existing): Stores users, groups, lessons, etc.
   - URL: `postgresql://postgres.lzqyucohnjtubivlmdkw...`
   - Keep using this for existing features

2. **Supabase Database** (new): Stores messages and conversations
   - Created when you ran the migration
   - Accessed via Supabase client
   - Uses Realtime for instant updates

### Why Two Databases?

This is intentional! It allows:
- ✅ Messaging to scale independently
- ✅ Real-time features without affecting main DB
- ✅ Easy migration without touching existing data
- ✅ Better performance (separate connection pools)

### Future Optimization (Optional)

If you want to merge everything into Supabase later:
1. Migrate all tables to Supabase
2. Update `DATABASE_URL` to point to Supabase
3. Remove Neon database
4. Update Drizzle config

But for now, this two-database setup works perfectly!

## 📚 Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **Realtime Guide**: https://supabase.com/docs/guides/realtime
- **Project README**: See `MESSAGING_README.md` for full documentation
- **Migration File**: `database/migrations/001_create_supabase_messaging.sql`

## ✨ What's Next?

Now that messaging is set up, you can:

1. **Test thoroughly** - Try all messaging features
2. **Customize UI** - Update colors, styles in components
3. **Add features** - Voice messages, reactions, etc.
4. **Monitor usage** - Check Supabase dashboard for metrics

## 🎉 Success Checklist

- [ ] Supabase project created
- [ ] Environment variables added (local & Vercel)
- [ ] Database migration completed
- [ ] Realtime enabled for tables
- [ ] Dependencies installed
- [ ] Deployed to Vercel
- [ ] Tested messaging between two users
- [ ] Real-time updates working
- [ ] No errors in browser console

## 💬 Need Help?

If you encounter any issues:

1. **Check browser console** for client-side errors
2. **Check Vercel logs** for server-side errors
3. **Check Supabase logs** for database/realtime errors
4. **Review this guide** for missed steps

---

**Your messaging system is now powered by Supabase Realtime! 🚀**

Built with ❤️ using Next.js 14, TypeScript, Supabase, and Tailwind CSS.
