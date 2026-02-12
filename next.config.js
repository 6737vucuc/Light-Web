const createNextIntlPlugin = require('next-intl/plugin');

// Specify the path to the i18n request configuration
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(), payment=()'
          },
          {
            key: 'Content-Security-Policy',
<<<<<<< HEAD
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com https://neon-image-bucket.s3.us-east-1.amazonaws.com; font-src 'self'; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
=======
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://res.cloudinary.com https://lzqyucohnjtubivlmdkw.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://res.cloudinary.com https://lzqyucohnjtubivlmdkw.supabase.co https://neon-image-bucket.s3.us-east-1.amazonaws.com https://neon-image-bucket.s3.amazonaws.com; font-src 'self' data:; connect-src 'self' https://res.cloudinary.com https://lzqyucohnjtubivlmdkw.supabase.co wss://*.pusher.com https://*.pusher.com; frame-src 'self' https://www.youtube.com; object-src 'none'; upgrade-insecure-requests;"
>>>>>>> 98cae3d2ff15d52f43e52465d0dda46a1c404f9b
          }
        ],
      },
    ];
  },

  // Image optimization with Cloudinary and Supabase support
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lzqyucohnjtubivlmdkw.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'neon-image-bucket.s3.us-east-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'neon-image-bucket.s3.amazonaws.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    // contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // Managed by headers() now
    contentDispositionType: 'attachment',
  },

  // Disable powered by header
  poweredByHeader: false,

  // Compression
  compress: true,

  // Webpack configuration for additional security
  webpack: (config, { isServer }) => {
    // Additional security configurations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Experimental features for better performance and security
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },


};

module.exports = withNextIntl(nextConfig);
