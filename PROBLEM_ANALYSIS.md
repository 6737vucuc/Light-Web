# تحليل مشكلة Supabase Client Not Initialized

## المشكلة
عند الضغط على زر "Sign in with Google" تظهر رسالة الخطأ:
```
Supabase client not initialized.
```

## السبب الجذري

### 1. **المشكلة الرئيسية: استخدام `process.env` في Client Component**
في ملف `/app/[locale]/auth/login/page.tsx` (السطور 21-26):

```typescript
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
```

**المشكلة:**
- الملف يستخدم `'use client'` في السطر الأول، مما يعني أنه Client Component
- في Client Components، متغيرات `process.env` لا تكون متاحة في المتصفح بنفس الطريقة
- Next.js يحتاج إلى أن تكون المتغيرات البيئية محددة في وقت البناء (build time)
- المتغيرات `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` غير موجودة في ملف `.env`

### 2. **عدم وجود ملف .env**
- المشروع يحتوي فقط على `.env.example`
- لا يوجد ملف `.env` أو `.env.local` يحتوي على قيم Supabase الفعلية
- في ملف `.env.example` لا توجد متغيرات Supabase أصلاً

### 3. **تضارب في الإعدادات**
- يوجد ملف `lib/supabase/client.ts` يحتوي على قيم Supabase مباشرة (hardcoded)
- صفحة تسجيل الدخول تحاول إنشاء client جديد بدلاً من استخدام الـ client الموجود

## الحل المقترح

### الحل 1: استخدام الـ Supabase Client الموجود (الأفضل)
استخدام الـ client المُعرّف في `lib/supabase/client.ts` بدلاً من إنشاء واحد جديد.

### الحل 2: إضافة المتغيرات البيئية
إضافة المتغيرات البيئية إلى `.env.local` وإلى Vercel Environment Variables.

### الحل 3: استخدام useState و useEffect
نقل إنشاء الـ client إلى داخل useEffect لضمان تنفيذه في المتصفح فقط.

## القرار النهائي
سنطبق **الحل 1** لأنه:
- الأبسط والأسرع
- يستخدم البنية الموجودة بالفعل
- يتجنب تكرار الكود
- يعمل مباشرة دون الحاجة لتغييرات في البيئة
