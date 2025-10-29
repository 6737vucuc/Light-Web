# Deployment Guide - Light of Life

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Push your code to GitHub
3. **Neon Database**: Already configured with the provided connection string
4. **Email Account**: Gmail account with app password configured
5. **Pusher Account**: Already configured with provided credentials
6. **IPInfo API**: Already configured with provided API key

## Environment Variables

Make sure to add these environment variables in Vercel:

```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_Hf73CljbDXzF@ep-fancy-forest-aedpagn2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require

# Email
EMAIL_USER=noreplylightoflife@gmail.com
EMAIL_PASS=cabjjzptfsxnzxlr

# Pusher
NEXT_PUBLIC_PUSHER_APP_KEY=b0f5756f20e894c0c2e7
PUSHER_APP_ID=2061314
PUSHER_SECRET=0af888670cc72dbbf5ab
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# IPInfo API
IPINFO_API_KEY=d6034ac9c81c27

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Deployment Steps

### Option 1: Using Vercel Dashboard

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Add all environment variables
   - Click "Deploy"

### Option 2: Using Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

   Or with token:
   ```bash
   vercel --token 2gyijkYv3YZFOofdIj63Bprl --prod
   ```

## Post-Deployment

### 1. Database Migration

The database is already set up with all tables. If you need to run migrations again:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 2. Create Admin User

After deployment, you'll need to manually set a user as admin in the database:

```sql
UPDATE users 
SET is_admin = true 
WHERE email = 'your-admin-email@example.com';
```

You can do this through Neon's SQL Editor at:
https://console.neon.tech/

### 3. Test Features

1. **Registration**: Test email verification
2. **Login**: Test VPN detection
3. **Lessons**: Create a lesson as admin
4. **Community**: Test group chat and posts
5. **Support**: Submit a prayer request
6. **Profile**: Update profile information

## Security Checklist

- [ ] Change JWT_SECRET to a strong random string
- [ ] Verify all environment variables are set correctly
- [ ] Test email sending functionality
- [ ] Test VPN detection
- [ ] Verify end-to-end encryption is working
- [ ] Test admin controls
- [ ] Enable HTTPS (Vercel does this automatically)
- [ ] Review and test ban system

## Monitoring

### Vercel Analytics

Enable Vercel Analytics in your dashboard for:
- Page views
- Performance metrics
- Error tracking

### Database Monitoring

Monitor your Neon database at:
https://console.neon.tech/

### Pusher Monitoring

Monitor real-time connections at:
https://dashboard.pusher.com/

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Check that all dependencies are installed:
   ```bash
   pnpm install
   ```

2. Verify TypeScript compilation:
   ```bash
   pnpm run check
   ```

3. Check build locally:
   ```bash
   pnpm run build
   ```

### Database Connection Issues

- Verify DATABASE_URL is correct
- Check that Neon database is active
- Ensure SSL mode is enabled

### Email Not Sending

- Verify Gmail app password is correct
- Check that "Less secure app access" is enabled (if using regular password)
- Use app-specific password for Gmail

### Pusher Not Working

- Verify all Pusher credentials are correct
- Check Pusher dashboard for connection status
- Ensure cluster is set to "us2"

## Custom Domain

To add a custom domain:

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Wait for SSL certificate to be issued

## Scaling

The application is built to scale automatically on Vercel:

- **Serverless Functions**: Auto-scale based on traffic
- **Edge Network**: Global CDN for static assets
- **Database**: Neon auto-scales with your usage
- **Pusher**: Scales with concurrent connections

## Support

For issues or questions:
- Email: noreplylightoflife@gmail.com
- GitHub Issues: Create an issue in your repository

---

**Note**: This is a production-ready application with enterprise-grade security features including end-to-end encryption, VPN detection, and comprehensive admin controls.

