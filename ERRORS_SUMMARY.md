# ملخص الأخطاء في Vercel Build

## الأخطاء الرئيسية

### 1. مشكلة استيراد `@/lib/auth`
**الملفات المتأثرة:**
- `app/api/follow/[userId]/route.ts`
- `app/api/profile/[username]/route.ts`
- وملفات أخرى

**الخطأ:**
```
Module not found: Can't resolve '@/lib/auth'
```

**السبب:** المسار الصحيح هو `@/lib/auth/jwt` وليس `@/lib/auth`

---

### 2. جداول محذوفة من schema
**الجداول المفقودة:**
- `dailyVerses` - مستخدم في `app/api/admin/verses/route.ts`
- `encryptionKeys` - مستخدم في `app/api/encryption/route.ts`
- `friendships` - مستخدم في `app/api/friends/[id]/route.ts`
- `lessons` - مستخدم في عدة ملفات
- `testimonies` - مستخدم في `app/api/support/testimonies/route.ts`
- `supportRequests` - مستخدم في `app/api/support/route.ts`

**السبب:** تم حذف هذه الجداول من schema الجديد لكن API endpoints لا تزال تستخدمها

---

### 3. استيراد `userPrivacySettings`
**الملفات المتأثرة:**
- `app/api/follow/[userId]/route.ts`
- `app/api/profile/[username]/route.ts`

**الخطأ:**
```
Export userPrivacySettings doesn't exist in target module
```

**السبب:** تم دمج إعدادات الخصوصية في جدول `users` مباشرة

---

## الحل المطلوب

1. تصحيح مسارات الاستيراد من `@/lib/auth` إلى `@/lib/auth/jwt`
2. إعادة الجداول المحذوفة إلى schema أو حذف/تعطيل API endpoints المرتبطة بها
3. تحديث الملفات التي تستخدم `userPrivacySettings` لاستخدام `users` مباشرة
