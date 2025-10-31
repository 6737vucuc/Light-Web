# استكشاف الأخطاء وإصلاحها

## المشكلة الحالية

عند محاولة التسجيل، يظهر خطأ: `"An error occurred during registration"`

## ما تم فحصه

### ✅ المتغيرات البيئية
- جميع المتغيرات البيئية موجودة على Vercel (18 متغير)
- `DATABASE_URL` موجود ويحتوي على رابط قاعدة البيانات الصحيح

### ✅ قاعدة البيانات
- الاتصال بقاعدة البيانات يعمل بشكل صحيح
- جميع الجداول موجودة (users, verification_codes, إلخ)

### ✅ الكود
- ملف `/lib/db/index.ts` تم إصلاحه لاستخدام `neon()` بشكل صحيح
- API التسجيل `/app/api/auth/register/route.ts` يحتوي على معالجة أخطاء جيدة

## الخطوات التالية للتشخيص

1. **فحص Logs على Vercel**
   - اذهب إلى https://vercel.com/dashboard
   - اختر المشروع
   - اذهب إلى **Deployments**
   - اختر آخر deployment
   - افتح **Runtime Logs** لرؤية الأخطاء الفعلية

2. **تفعيل Logging**
   - أضف `console.log` في API للتأكد من وصول الطلبات
   - تحقق من الأخطاء في `try-catch` blocks

3. **اختبار محلي**
   ```bash
   cd /home/ubuntu/Light-Web
   cp .env.example .env.local
   pnpm dev
   # ثم اختبر التسجيل على http://localhost:3000
   ```

## الحل المحتمل

المشكلة قد تكون في أن Vercel يستخدم **Edge Runtime** بدلاً من **Node.js Runtime**.

### إضافة Route Config

أضف في بداية ملف `/app/api/auth/register/route.ts`:

```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

هذا يجبر Vercel على استخدام Node.js Runtime بدلاً من Edge Runtime.

## معلومات إضافية

- **آخر deployment**: https://light-web-project-ixohhobk6-anwar-kouns-projects.vercel.app
- **Project ID**: prj_CzF2H6oiw63wVa9YjLDCEXumiA47
- **Database**: Neon PostgreSQL
