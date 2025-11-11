# دليل النشر على Vercel

## 🚀 خطوات النشر

### 1. تحديث قاعدة البيانات

قبل النشر، يجب تحديث قاعدة البيانات بالجداول والأعمدة الجديدة:

```bash
# الاتصال بقاعدة البيانات
psql $DATABASE_URL

# تشغيل سكريبت التحديث
\i update-stories-instagram-style.sql

# أو باستخدام psql مباشرة
psql $DATABASE_URL -f update-stories-instagram-style.sql
```

### 2. متغيرات البيئة المطلوبة

تأكد من إضافة جميع متغيرات البيئة في Vercel Dashboard:

#### متغيرات أساسية:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your_jwt_secret_minimum_32_characters
MESSAGE_ENCRYPTION_KEY=your_encryption_key_minimum_32_characters
```

#### Pusher (للمراسلة الفورية):
```env
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=your_pusher_cluster
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_pusher_cluster
```

#### Cloudinary (لرفع الصور والفيديو):
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

#### اختياري (للبريد الإلكتروني):
```env
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### 3. النشر التلقائي عبر Git

التحديثات تم دفعها إلى GitHub، وإذا كان المشروع مربوط بـ Vercel، سيتم النشر تلقائياً.

للتحقق من حالة النشر:
1. افتح [Vercel Dashboard](https://vercel.com/dashboard)
2. اختر المشروع
3. تحقق من تبويب "Deployments"

### 4. النشر اليدوي (إذا لزم الأمر)

إذا لم يكن المشروع مربوط بـ Git:

```bash
# تثبيت Vercel CLI
npm install -g vercel

# تسجيل الدخول
vercel login

# النشر
vercel --prod
```

### 5. التحقق من النشر

بعد النشر، تحقق من:

✅ **الصفحة الرئيسية**: تحميل صحيح
✅ **تسجيل الدخول**: يعمل بشكل صحيح
✅ **Stories**: عرض وإنشاء Stories
✅ **المراسلة**: إرسال واستقبال الرسائل
✅ **Toast Notifications**: ظهور الإشعارات بدلاً من alert
✅ **البوستات**: إنشاء وعرض المنشورات

---

## 🔧 استكشاف الأخطاء

### مشكلة: أخطاء قاعدة البيانات

**الحل:**
```bash
# تحقق من اتصال قاعدة البيانات
psql $DATABASE_URL -c "SELECT 1;"

# تشغيل migrations
npm run db:push

# أو تشغيل SQL يدوياً
psql $DATABASE_URL -f update-stories-instagram-style.sql
```

### مشكلة: Toast لا يظهر

**الحل:**
- تأكد من أن `ToastProvider` موجود في `app/layout.tsx`
- تأكد من أن `ToastContainer` موجود داخل `ToastProvider`
- افتح Console في المتصفح للتحقق من الأخطاء

### مشكلة: الرسائل غير مشفرة

**الحل:**
- تأكد من وجود `MESSAGE_ENCRYPTION_KEY` في متغيرات البيئة
- يجب أن يكون المفتاح 32 حرف على الأقل
- أعد تشغيل التطبيق بعد إضافة المفتاح

### مشكلة: Pusher لا يعمل

**الحل:**
- تحقق من صحة credentials في Pusher Dashboard
- تأكد من إضافة `NEXT_PUBLIC_` للمتغيرات المستخدمة في Frontend
- تحقق من Pusher Debug Console

---

## 📊 مراقبة الأداء

### Vercel Analytics
- افتح تبويب "Analytics" في Vercel Dashboard
- راقب:
  - Response Time
  - Error Rate
  - Traffic
  - Geographic Distribution

### Logs
```bash
# عرض logs في الوقت الفعلي
vercel logs --follow

# عرض logs لنشر محدد
vercel logs [deployment-url]
```

---

## 🔒 الأمان

### تأكد من:
✅ جميع متغيرات البيئة الحساسة في Vercel (وليس في الكود)
✅ HTTPS مفعّل (تلقائي في Vercel)
✅ CORS مضبوط بشكل صحيح
✅ Rate Limiting مفعّل
✅ Input Validation على جميع APIs

---

## 📈 التحسينات المستقبلية

### أداء:
- [ ] إضافة Redis للـ Caching
- [ ] تحسين Database Indexes
- [ ] Image Optimization (WebP)
- [ ] Lazy Loading للمكونات الثقيلة

### ميزات:
- [ ] Video Calls (LiveKit)
- [ ] Voice Messages
- [ ] Stories Archive
- [ ] Advanced Analytics
- [ ] Content Moderation AI

---

## 📞 الدعم

إذا واجهت أي مشاكل:

1. **تحقق من Logs**:
   ```bash
   vercel logs --follow
   ```

2. **تحقق من Database**:
   ```bash
   psql $DATABASE_URL -c "\dt"  # عرض الجداول
   psql $DATABASE_URL -c "\d stories"  # عرض بنية جدول stories
   ```

3. **تحقق من Environment Variables**:
   - Vercel Dashboard → Project → Settings → Environment Variables

4. **GitHub Issues**: افتح issue في المستودع

---

**تاريخ آخر تحديث**: 11 نوفمبر 2025
**الإصدار**: 2.0.0
**الحالة**: ✅ جاهز للنشر
