# إصلاح مشكلة المصادقة بواسطة Google

## المشكلة الأصلية
عند تسجيل الدخول بواسطة Google، لم يتم إنشاء جلسة مصادقة مطابقة للمصادقة الأساسية.

## الإصلاحات المطبقة

### 1. توحيد محتوى JWT Token
**الملف**: `/app/api/auth/callback/route.ts`

**قبل الإصلاح**:
```typescript
const token = await createToken({
  userId: dbUser.id,
  email: dbUser.email,
  isAdmin: dbUser.isAdmin,
});
```

**بعد الإصلاح**:
```typescript
const token = await createToken({
  userId: dbUser.id,
  email: dbUser.email,
  isAdmin: dbUser.isAdmin,
  name: dbUser.name,
  avatar: dbUser.avatar,
  username: dbUser.email.split('@')[0],
});
```

### 2. توحيد إعدادات Cookie
**الملف**: `/app/api/auth/callback/route.ts`

**قبل الإصلاح**:
```typescript
response.cookies.set('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/',
});
```

**بعد الإصلاح**:
```typescript
response.cookies.set('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
});
```

### 3. إضافة إعادة تعيين حقول الأمان
**الملف**: `/app/api/auth/callback/route.ts`

تم إضافة إعادة تعيين محاولات تسجيل الدخول الفاشلة:
```typescript
await db.update(users)
  .set({
    // ... حقول أخرى
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastFailedLogin: null,
  })
  .where(eq(users.id, dbUser.id));
```

### 4. تحديث إعدادات Login للتوافق
**الملف**: `/app/api/auth/login/route.ts`

تم تغيير `sameSite` من `'strict'` إلى `'lax'` للتوافق مع OAuth:
```typescript
response.cookies.set('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', // كان 'strict'
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
});
```

## النتيجة
الآن كلا نظامي المصادقة (الأساسية و Google OAuth) يعملان بنفس الطريقة:
- نفس محتوى JWT Token
- نفس إعدادات Cookie
- نفس معالجة حقول الأمان
- نفس مدة الجلسة (7 أيام)

## الاختبار
للتأكد من نجاح الإصلاح:
1. سجل دخول بواسطة Google
2. تحقق من وجود cookie باسم `token`
3. تحقق من أن الجلسة تستمر بعد إعادة تحميل الصفحة
4. تحقق من أن بيانات المستخدم تظهر بشكل صحيح

## ملاحظات مهمة
- تم استخدام `sameSite: 'lax'` بدلاً من `'strict'` لأن OAuth redirects تتطلب ذلك
- `lax` لا يزال يوفر حماية جيدة ضد CSRF attacks
- `secure` يعتمد على البيئة (production فقط) لتسهيل التطوير المحلي
