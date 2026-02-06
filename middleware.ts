import { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { proxy } from './proxy';

// Create the i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export async function middleware(request: NextRequest) {
  // 1. Run security proxy logic (WAF, Rate Limiting, Security Headers)
  const proxyResponse = proxy(request);
  
  // If proxy returns a special response (like 429 or 403), return it immediately
  if (proxyResponse.status !== 200 && proxyResponse.status !== 307 && proxyResponse.status !== 308) {
    // Note: NextResponse.next() returns a response with status 200 but it's a signal to continue
    // We only want to intercept actual error responses or redirects from proxy
    if (proxyResponse.status !== 200) {
        return proxyResponse;
    }
  }

  // 2. Run i18n middleware
  const i18nResponse = intlMiddleware(request);
  
  // 3. Merge headers from proxyResponse into i18nResponse
  // This ensures security headers from proxy are included in the final response
  proxyResponse.headers.forEach((value, key) => {
    i18nResponse.headers.set(key, value);
  });

  return i18nResponse;
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
