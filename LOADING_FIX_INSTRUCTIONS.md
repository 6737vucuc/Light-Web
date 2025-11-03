# حل مشكلة Loading المستمر

## المشكلة
جميع الصفحات تعطي Loading مستمر ولا تظهر المحتوى.

## السبب الرئيسي
المشكلة الأساسية هي عدم وجود ملف `.env.local` يحتوي على متغيرات البيئة المطلوبة، خاصة `DATABASE_URL`.

## الحل

### 1. إنشاء ملف .env.local
تم إنشاء ملف `.env.local` في جذر المشروع يحتوي على:

```env
DATABASE_URL="postgresql://neondb_owner:npg_Hf73CljbDXzF@ep-fancy-forest-aedpagn2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long-for-security"
MESSAGE_ENCRYPTION_KEY="your-32-char-encryption-key-12"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. الخطوات المطلوبة للتشغيل المحلي

#### أ. تثبيت المكتبات
```bash
cd /path/to/Light-Web
npm install
# أو
pnpm install
```

#### ب. تشغيل المشروع
```bash
npm run dev
# أو
pnpm dev
```

#### ج. فتح المتصفح
افتح `http://localhost:3000`

### 3. للنشر على Vercel

#### أ. إضافة متغيرات البيئة في Vercel
يجب إضافة المتغيرات التالية في لوحة تحكم Vercel:

**متغيرات إلزامية:**
- `DATABASE_URL`: رابط قاعدة البيانات
- `JWT_SECRET`: مفتاح سري للـ JWT
- `MESSAGE_ENCRYPTION_KEY`: مفتاح تشفير الرسائل

**متغيرات اختيارية (للميزات الإضافية):**
- `CLOUDINARY_CLOUD_NAME`: لرفع الصور
- `CLOUDINARY_API_KEY`: مفتاح Cloudinary
- `CLOUDINARY_API_SECRET`: سر Cloudinary
- `PUSHER_APP_ID`: للرسائل الفورية
- `PUSHER_KEY`: مفتاح Pusher
- `PUSHER_SECRET`: سر Pusher
- `PUSHER_CLUSTER`: منطقة Pusher
- `LIVEKIT_API_KEY`: للمكالمات الصوتية/المرئية
- `LIVEKIT_API_SECRET`: سر LiveKit
- `LIVEKIT_URL`: رابط خادم LiveKit

#### ب. النشر
```bash
# باستخدام Vercel CLI
vercel --prod

# أو ربط المشروع بـ GitHub وسيتم النشر تلقائياً
```

## ملاحظات مهمة

### 1. قاعدة البيانات
- تم إصلاح جميع مشاكل التعارضات في الـ ID
- تم إضافة الأعمدة الناقصة
- قاعدة البيانات جاهزة للاستخدام

### 2. الأمان
- **لا تشارك** ملف `.env.local` أو محتوياته مع أحد
- **لا ترفع** ملف `.env.local` على GitHub (موجود في .gitignore)
- استخدم مفاتيح قوية للـ JWT والتشفير

### 3. الميزات الاختيارية
بعض الميزات تحتاج إلى خدمات خارجية:
- **الصور/الفيديو**: Cloudinary
- **الرسائل الفورية**: Pusher
- **المكالمات**: LiveKit

إذا لم تكن هذه الخدمات مفعلة، ستعمل باقي الميزات بشكل طبيعي.

## استكشاف الأخطاء

### المشكلة: Loading مستمر
**الحل:**
1. تأكد من وجود ملف `.env.local`
2. تأكد من صحة `DATABASE_URL`
3. تأكد من تشغيل الخادم: `npm run dev`

### المشكلة: خطأ في الاتصال بقاعدة البيانات
**الحل:**
1. تحقق من رابط قاعدة البيانات
2. تأكد من أن قاعدة البيانات تعمل
3. تحقق من الاتصال بالإنترنت

### المشكلة: خطأ 401 Unauthorized
**الحل:**
1. تأكد من تسجيل الدخول
2. تحقق من صحة `JWT_SECRET`
3. امسح الكوكيز وسجل الدخول مرة أخرى

## الدعم الفني

إذا استمرت المشكلة:
1. افتح Console في المتصفح (F12)
2. ابحث عن أي أخطاء
3. تحقق من سجلات الخادم (Terminal)
4. شارك رسالة الخطأ للحصول على المساعدة
