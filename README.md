# Light of Life - Christian Ministry Website

A professional Christian ministry website built with Next.js, featuring end-to-end encrypted messaging, community features, and comprehensive admin controls.

## Features

### Authentication & Security
- User registration with email verification (6-digit code via Nodemailer)
- Password strength validation
- Argon2 password hashing
- JWT-based authentication
- VPN detection using IPInfo API
- End-to-end encryption for private and group chats (AES-256-GCM + RSA-OAEP)

### User Features
- **Lessons**: Browse and study biblical teachings
- **Support**: Submit prayer requests, testimonies, and technical issues
- **Community**:
  - Group chat with real-time messaging (Pusher)
  - Public posts with images, likes, and comments
  - Long-press reactions (Facebook-style emojis)
  - Friend system (add, search, message)
- **Profile**: Upload avatar, edit name and password (real-time updates)

### Admin Dashboard
- Manage lessons (create, edit, delete)
- Manage daily verses with scheduled dates
- Review and approve/reject testimonies
- Handle support requests
- User management (ban, delete with custom duration)
- VPN detection logs and ban notifications

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Authentication**: JWT (jose)
- **Password Hashing**: Argon2
- **Email**: Nodemailer
- **Real-time**: Pusher
- **Encryption**: Web Crypto API (AES-256-GCM, RSA-OAEP)
- **VPN Detection**: IPInfo API
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="your-neon-postgres-url"

# Email
EMAIL_USER="noreplylightoflife@gmail.com"
EMAIL_PASS="your-app-password"

# Pusher
NEXT_PUBLIC_PUSHER_APP_KEY="your-key"
PUSHER_APP_ID="your-app-id"
PUSHER_SECRET="your-secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"

# IPInfo API
IPINFO_API_KEY="your-api-key"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key"
```

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Set up the database:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

Or use the Vercel CLI:
```bash
vercel --token YOUR_VERCEL_TOKEN
```

## Security Features

- **End-to-End Encryption**: All private and group messages are encrypted using AES-256-GCM
- **Key Exchange**: RSA-OAEP (4096-bit) for secure key distribution
- **Password Security**: Argon2 hashing with salt
- **VPN Detection**: Automatic detection and logging of VPN/proxy usage
- **Ban System**: Temporary bans with custom duration
- **HTTPS Only**: All communications over secure connections

## Project Structure

```
light-of-life/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── lessons/
│   │   ├── support/
│   │   ├── posts/
│   │   ├── messages/
│   │   └── admin/
│   ├── auth/
│   ├── lessons/
│   ├── support/
│   ├── community/
│   ├── profile/
│   └── admin/
├── components/
├── lib/
│   ├── db/
│   ├── auth/
│   └── utils/
└── public/
```

## License

MIT

## Support

For support, email noreplylightoflife@gmail.com

---

May Christ's love and peace be with you always! 🕊️
