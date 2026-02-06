# دليل إعداد Vercel لتفعيل Google OAuth

## ⚠️ خطوات مهمة جداً

بعد رفع التحديثات إلى GitHub، يجب إضافة المتغيرات البيئية على Vercel لضمان عمل Google Login.

## الخطوات التفصيلية

### 1. الدخول إلى إعدادات المشروع على Vercel

1. اذهب إلى: https://vercel.com/dashboard
2. اختر مشروع `Light-Web` (أو `light-web-project`)
3. اضغط على `Settings` من القائمة العلوية
4. اختر `Environment Variables` من القائمة الجانبية

### 2. إضافة المتغيرات البيئية

أضف المتغيرات التالية واحدة تلو الأخرى:

#### المتغير الأول: NEXT_PUBLIC_SUPABASE_URL
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://lzqyucohnjtubivlmdkw.supabase.co
Environment: Production, Preview, Development (اختر الثلاثة)
```

#### المتغير الثاني: NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6cXl1Y29obmp0dWJpdmxtZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTQ5MTYsImV4cCI6MjA4NTEzMDkxNn0.IvCkw4rkAcDBRK4T-Ejst4TYS4WquCi-YV0gYv4YudY
Environment: Production, Preview, Development (اختر الثلاثة)
```

#### المتغير الثالث: DATABASE_URL
```
Name: DATABASE_URL
Value: postgresql://postgres.lzqyucohnjtubivlmdkw:P3bJdw68gG4dUeTs@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
Environment: Production, Preview, Development (اختر الثلاثة)
```

### 3. إعادة النشر (Redeploy)

بعد إضافة المتغيرات البيئية:

1. اذهب إلى تبويب `Deployments`
2. اختر آخر deployment
3. اضغط على النقاط الثلاث `...` بجانبه
4. اختر `Redeploy`
5. اضغط على `Redeploy` مرة أخرى للتأكيد

### 4. إعداد Google OAuth على Supabase

للتأكد من أن Google OAuth معد بشكل صحيح:

1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك `lzqyucohnjtubivlmdkw`
3. من القائمة الجانبية، اختر `Authentication` > `Providers`
4. ابحث عن `Google` واضغط عليه
5. تأكد من أن `Enable Sign in with Google` مفعّل

#### إضافة Redirect URLs

في نفس صفحة إعدادات Google Provider، أضف هذه الروابط في `Authorized redirect URIs`:

```
https://lzqyucohnjtubivlmdkw.supabase.co/auth/v1/callback
https://light-web-project.vercel.app/api/auth/callback
http://localhost:3000/api/auth/callback
```

**ملاحظة:** إذا كان رابط Vercel مختلفاً، استبدل `light-web-project.vercel.app` برابطك الفعلي.

### 5. الحصول على Google OAuth Credentials

إذا لم تكن قد أعددت Google OAuth بعد:

1. اذهب إلى: https://console.cloud.google.com/
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل `Google+ API`
4. اذهب إلى `Credentials` > `Create Credentials` > `OAuth 2.0 Client ID`
5. اختر `Web application`
6. أضف Authorized redirect URIs:
   ```
   https://lzqyucohnjtubivlmdkw.supabase.co/auth/v1/callback
   ```
7. احفظ `Client ID` و `Client Secret`
8. ارجع إلى Supabase وأدخلهما في إعدادات Google Provider

## اختبار الحل

بعد إكمال جميع الخطوات:

1. انتظر حتى ينتهي Vercel من إعادة النشر (عادة 1-2 دقيقة)
2. افتح: https://light-web-project.vercel.app/en/auth/login
3. اضغط على زر "Sign in with Google"
4. يجب أن يتم توجيهك إلى صفحة تسجيل الدخول من Google
5. بعد تسجيل الدخول، يجب أن يتم توجيهك إلى الصفحة الرئيسية

## حل المشاكل المحتملة

### إذا ظهرت رسالة "Supabase client not initialized" مرة أخرى:
- تأكد من إضافة جميع المتغيرات البيئية على Vercel
- تأكد من إعادة نشر المشروع بعد إضافة المتغيرات
- امسح الكاش (Cache) في المتصفح وحاول مرة أخرى

### إذا ظهرت رسالة "redirect_uri_mismatch":
- تأكد من إضافة جميع روابط الـ redirect في Google Cloud Console
- تأكد من إضافة نفس الروابط في Supabase Dashboard

### إذا لم يتم إنشاء المستخدم في قاعدة البيانات:
- تأكد من أن جدول `users` موجود في قاعدة البيانات
- تحقق من أن الأعمدة المطلوبة موجودة (googleId, authProvider, oauthData, إلخ)

## ملاحظات أمنية

⚠️ **مهم:**
- لا تشارك `SUPABASE_ANON_KEY` أو `DATABASE_URL` مع أحد
- استخدم `.gitignore` لمنع رفع `.env.local` إلى GitHub
- راجع المتغيرات البيئية بشكل دوري وغيّرها إذا لزم الأمر

## الخلاصة

بعد إكمال هذه الخطوات، يجب أن يعمل تسجيل الدخول بواسطة Google بشكل صحيح على كل من البيئة المحلية (localhost) والإنتاج (Vercel).
