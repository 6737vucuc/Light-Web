# تحسينات المصادقة الثنائية (2FA) وتسجيل الخروج

## نظرة عامة
تم إضافة ميزة المصادقة الثنائية (2FA) الكاملة لجميع المستخدمين وتحسين وظيفة تسجيل الخروج لضمان مسح جميع السجلات والبيانات المخزنة.

---

## التغييرات الرئيسية

### 1. إضافة حقول 2FA إلى قاعدة البيانات

تم إضافة الحقول التالية إلى جدول `users`:

- `two_factor_enabled` (BOOLEAN): حالة تفعيل المصادقة الثنائية
- `two_factor_secret` (TEXT): المفتاح السري لـ TOTP
- `two_factor_backup_codes` (JSONB): أكواد النسخ الاحتياطي
- `two_factor_method` (VARCHAR): طريقة المصادقة ('authenticator' أو 'email')
- `two_factor_verified_at` (TIMESTAMP): تاريخ التحقق من 2FA

**الملفات المعدلة:**
- `lib/db/schema.ts`
- `migrations/add_2fa_fields.sql` (ملف جديد)

---

### 2. تحديث نظام 2FA ليستخدم قاعدة البيانات

تم تحديث مكتبة `TwoFactorAuth` لتخزين بيانات 2FA في قاعدة البيانات بدلاً من الذاكرة المؤقتة.

**المميزات الجديدة:**
- تخزين دائم لبيانات 2FA في قاعدة البيانات
- دعم TOTP (Time-based One-Time Password)
- أكواد نسخ احتياطي (10 أكواد)
- التحقق من 2FA أثناء تسجيل الدخول
- إمكانية تعطيل 2FA

**الوظائف الرئيسية:**
```typescript
- enable2FA(userId): تفعيل 2FA وإنشاء QR code
- verify2FA(userId, token): التحقق من كود TOTP وتفعيل 2FA
- disable2FA(userId, token): تعطيل 2FA
- verify2FALogin(userId, token): التحقق من 2FA أثناء تسجيل الدخول
- verifyBackupCode(userId, code): التحقق من كود النسخ الاحتياطي
- is2FAEnabled(userId): التحقق من حالة 2FA
```

**الملفات المعدلة:**
- `lib/auth/two-factor.ts`

---

### 3. دمج 2FA مع نظام تسجيل الدخول

تم تحديث API تسجيل الدخول لدعم المصادقة الثنائية:

**آلية العمل:**
1. المستخدم يدخل البريد الإلكتروني وكلمة المرور
2. إذا كانت 2FA مفعلة، يتم طلب كود التحقق
3. يتم التحقق من كود TOTP أو كود النسخ الاحتياطي
4. عند النجاح، يتم إنشاء JWT token وتسجيل الدخول

**الاستجابة عند تفعيل 2FA:**
```json
{
  "requires2FA": true,
  "message": "Two-factor authentication code required",
  "method": "authenticator"
}
```

**الملفات المعدلة:**
- `app/api/auth/login/route.ts`

---

### 4. تحسين وظيفة تسجيل الخروج

تم تحسين API تسجيل الخروج لضمان مسح جميع البيانات:

**على مستوى الخادم (Server-side):**
- مسح جميع cookies المتعلقة بالمصادقة:
  - `token`
  - `auth_token`
  - `session`
  - `session_token`
  - `jwt`
  - `access_token`
  - `refresh_token`
- مسح الـ cookies بعدة إعدادات لضمان الحذف الكامل
- إضافة header `Clear-Site-Data` لمسح الـ cache والـ storage
- تحديث حالة المستخدم في قاعدة البيانات (`isOnline = false`)

**على مستوى العميل (Client-side):**
- مسح `localStorage` بالكامل
- مسح `sessionStorage` بالكامل
- حذف جميع قواعد بيانات IndexedDB إن وجدت
- إعادة توجيه المستخدم لصفحة تسجيل الدخول

**الملفات المعدلة:**
- `app/api/auth/logout/route.ts`
- `components/Navbar.tsx`
- `app/[locale]/settings/page.tsx`

---

## كيفية تطبيق التغييرات

### 1. تشغيل Migration لإضافة حقول 2FA

قم بتشغيل الأمر التالي لإضافة الحقول الجديدة إلى قاعدة البيانات:

```bash
# باستخدام psql
psql -h YOUR_HOST -p 5432 -U YOUR_USER -d YOUR_DB -f migrations/add_2fa_fields.sql

# أو باستخدام Supabase SQL Editor
# انسخ محتوى الملف migrations/add_2fa_fields.sql وقم بتشغيله في SQL Editor
```

### 2. تثبيت المكتبات المطلوبة

المكتبات التالية مطلوبة لعمل 2FA:

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

### 3. إعادة تشغيل التطبيق

```bash
npm run dev
```

---

## كيفية استخدام 2FA

### للمستخدمين:

1. **تفعيل 2FA:**
   - اذهب إلى الإعدادات (Settings)
   - اختر "الأمان" (Security)
   - اضغط على "تفعيل المصادقة الثنائية"
   - اختر الطريقة (Authenticator أو Email)
   - امسح QR code باستخدام تطبيق Authenticator (مثل Google Authenticator)
   - أدخل الكود للتحقق

2. **تسجيل الدخول مع 2FA:**
   - أدخل البريد الإلكتروني وكلمة المرور
   - أدخل كود 2FA من تطبيق Authenticator
   - أو استخدم أحد أكواد النسخ الاحتياطي

3. **تعطيل 2FA:**
   - اذهب إلى الإعدادات
   - اختر "الأمان"
   - اضغط على "تعطيل المصادقة الثنائية"
   - أدخل كود التحقق

### للمطورين:

**API Endpoints:**

1. **تفعيل 2FA:**
```bash
POST /api/auth/2fa/enable
Body: { "method": "authenticator" }
Response: { "secret", "qrCode", "backupCodes" }
```

2. **التحقق من 2FA:**
```bash
POST /api/auth/2fa/verify
Body: { "method": "authenticator", "code": "123456" }
Response: { "success": true }
```

3. **تسجيل الدخول مع 2FA:**
```bash
POST /api/auth/login
Body: { "email", "password", "twoFactorCode": "123456" }
```

---

## الأمان والأفضليات

### أمان 2FA:
- ✅ تخزين آمن للمفاتيح السرية في قاعدة البيانات
- ✅ استخدام TOTP (RFC 6238) المعيار الصناعي
- ✅ أكواد نسخ احتياطي لحالات الطوارئ
- ✅ حذف أكواد النسخ الاحتياطي بعد الاستخدام
- ✅ دعم time window للتعامل مع تأخير الساعة

### أمان تسجيل الخروج:
- ✅ مسح شامل لجميع cookies
- ✅ مسح localStorage و sessionStorage
- ✅ حذف IndexedDB
- ✅ مسح الـ cache من خلال headers
- ✅ تحديث حالة المستخدم في قاعدة البيانات

---

## الاختبار

### اختبار 2FA:

1. إنشاء حساب جديد
2. تفعيل 2FA من الإعدادات
3. تسجيل الخروج
4. محاولة تسجيل الدخول بدون كود 2FA (يجب أن يطلب الكود)
5. تسجيل الدخول بكود 2FA صحيح
6. اختبار كود نسخ احتياطي

### اختبار تسجيل الخروج:

1. تسجيل الدخول
2. فتح Developer Tools → Application
3. التحقق من وجود cookies و localStorage
4. تسجيل الخروج
5. التحقق من مسح جميع البيانات

---

## الملاحظات المهمة

1. **أكواد النسخ الاحتياطي:** احفظها في مكان آمن، كل كود يُستخدم مرة واحدة فقط
2. **تطبيقات Authenticator المدعومة:** Google Authenticator, Microsoft Authenticator, Authy
3. **الأمان:** لا تشارك المفتاح السري أو QR code مع أي شخص
4. **الاستعادة:** إذا فقدت الوصول، استخدم أكواد النسخ الاحتياطي

---

## الملفات المعدلة - ملخص

### ملفات جديدة:
- `migrations/add_2fa_fields.sql`
- `2FA_AND_LOGOUT_IMPROVEMENTS.md`

### ملفات معدلة:
- `lib/db/schema.ts` - إضافة حقول 2FA
- `lib/auth/two-factor.ts` - تحديث لاستخدام قاعدة البيانات
- `app/api/auth/login/route.ts` - دمج 2FA مع تسجيل الدخول
- `app/api/auth/logout/route.ts` - تحسين مسح البيانات
- `components/Navbar.tsx` - تحديث وظيفة logout
- `app/[locale]/settings/page.tsx` - تحديث وظيفة logout

---

## الدعم والمساعدة

إذا واجهت أي مشاكل:
1. تحقق من تشغيل migration بنجاح
2. تأكد من تثبيت المكتبات المطلوبة
3. راجع logs الخادم للأخطاء
4. تأكد من صحة إعدادات قاعدة البيانات

---

**تاريخ التحديث:** 2026-02-09
**الإصدار:** 1.0.0
