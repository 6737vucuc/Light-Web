# توثيق إصلاح مشكلة Google Login

## المشكلة
```
Supabase client not initialized.
```

## الملفات المعدلة

### 1. `/app/[locale]/auth/login/page.tsx`
**التغيير:**
- إزالة محاولة إنشاء Supabase client جديد باستخدام `process.env`
- استيراد واستخدام الـ client الموجود من `@/lib/supabase/client`

**قبل:**
```typescript
import { createBrowserClient } from '@supabase/ssr';

let supabase: ReturnType<typeof createBrowserClient> | null = null;

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const handleGoogleLogin = async () => {
  if (!supabase) return setError('Supabase client not initialized.');
  // ...
}
```

**بعد:**
```typescript
import { supabase } from '@/lib/supabase/client';

const handleGoogleLogin = async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // ...
    });
  } catch (err: any) {
    // ...
  }
};
```

### 2. `/lib/supabase/auth.ts`
**التغيير:**
- استبدال `process.env` بالقيم الثابتة من `client.ts`

**قبل:**
```typescript
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
```

**بعد:**
```typescript
const supabaseUrl = 'https://lzqyucohnjtubivlmdkw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const createClient = () => {
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
};
```

### 3. `/app/api/auth/callback/route.ts`
**التغيير:**
- إضافة القيم الثابتة واستخدامها بدلاً من `process.env`

**قبل:**
```typescript
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  // ...
);
```

**بعد:**
```typescript
const supabaseUrl = 'https://lzqyucohnjtubivlmdkw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const supabase = createServerClient(
  supabaseUrl,
  supabaseAnonKey,
  // ...
);
```

### 4. `.env.local` (جديد)
**الإضافة:**
- إنشاء ملف `.env.local` مع المتغيرات البيئية اللازمة

```env
NEXT_PUBLIC_SUPABASE_URL=https://lzqyucohnjtubivlmdkw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres.lzqyucohnjtubivlmdkw:P3bJdw68gG4dUeTs@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

## خطوات إضافية مطلوبة على Vercel

### 1. إضافة Environment Variables على Vercel
يجب إضافة المتغيرات التالية في إعدادات المشروع على Vercel:

1. اذهب إلى: `Project Settings` > `Environment Variables`
2. أضف المتغيرات التالية:

```
NEXT_PUBLIC_SUPABASE_URL=https://lzqyucohnjtubivlmdkw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6cXl1Y29obmp0dWJpdmxtZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTQ5MTYsImV4cCI6MjA4NTEzMDkxNn0.IvCkw4rkAcDBRK4T-Ejst4TYS4WquCi-YV0gYv4YudY
DATABASE_URL=postgresql://postgres.lzqyucohnjtubivlmdkw:P3bJdw68gG4dUeTs@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

3. احفظ التغييرات
4. أعد نشر المشروع (Redeploy)

### 2. إعداد Google OAuth على Supabase
تأكد من إعداد Google OAuth في Supabase Dashboard:

1. اذهب إلى: `Authentication` > `Providers` > `Google`
2. فعّل Google Provider
3. أضف `Authorized redirect URIs`:
   - `https://lzqyucohnjtubivlmdkw.supabase.co/auth/v1/callback`
   - `https://light-web-project.vercel.app/api/auth/callback`
   - `http://localhost:3000/api/auth/callback` (للتطوير المحلي)

## اختبار الحل

### محلياً:
```bash
npm run dev
# أو
pnpm dev
```
ثم افتح `http://localhost:3000/auth/login` واضغط على "Sign in with Google"

### على Vercel:
بعد رفع التحديثات ونشر المشروع، افتح:
`https://light-web-project.vercel.app/en/auth/login`

## ملاحظات أمنية

⚠️ **مهم جداً:**
- ملف `.env.local` يحتوي على بيانات حساسة
- تأكد من أن `.env.local` مُضاف إلى `.gitignore`
- لا ترفع هذا الملف إلى GitHub أبداً
- استخدم Vercel Environment Variables للإنتاج

## الخلاصة

الحل يعتمد على استخدام الـ Supabase client الموجود بالفعل في المشروع بدلاً من محاولة إنشاء واحد جديد باستخدام متغيرات بيئية غير موجودة. هذا يضمن أن الـ client يكون دائماً متاحاً ومُهيأً بشكل صحيح.
