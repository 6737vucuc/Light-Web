# تحليل مشكلة المصادقة بواسطة Google

## المشكلة
عند تسجيل الدخول بواسطة Google، لا يتم إنشاء جلسة مصادقة مثل المصادقة الأساسية (تسجيل الدخول بالبريد الإلكتروني وكلمة المرور).

## التحليل

### 1. المصادقة الأساسية (Login)
في ملف `/app/api/auth/login/route.ts`:
- يتم إنشاء JWT token باستخدام `createToken()`
- يتم تعيين التوكن في cookie بإعدادات محددة:
  - `httpOnly: true`
  - `secure: true` (في الإنتاج)
  - `sameSite: 'strict'`
  - `maxAge: 7 days`
  - `path: '/'`

### 2. المصادقة بواسطة Google (Callback)
في ملف `/app/api/auth/callback/route.ts`:
- يتم إنشاء JWT token بنفس الطريقة
- يتم تعيين التوكن في cookie بإعدادات مختلفة:
  - `httpOnly: true`
  - `secure: true`
  - `sameSite: 'lax'` ← **مختلف!**
  - `maxAge: 30 days` ← **مختلف!**
  - `path: '/'`

### 3. الفرق الرئيسي

#### في Login (المصادقة الأساسية):
```typescript
response.cookies.set('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
});
```

#### في Callback (Google OAuth):
```typescript
response.cookies.set('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/',
});
```

## المشاكل المحتملة

1. **sameSite مختلف**: 
   - Login يستخدم `strict`
   - Callback يستخدم `lax`
   - هذا قد يسبب مشاكل في التوافق

2. **secure مختلف**:
   - Login يستخدم `process.env.NODE_ENV === 'production'`
   - Callback يستخدم `true` دائماً
   - في بيئة التطوير، قد لا يعمل Callback بشكل صحيح

3. **maxAge مختلف**:
   - Login: 7 أيام
   - Callback: 30 يوم
   - يجب توحيد المدة

4. **محتوى التوكن مختلف**:
   - Login يتضمن: `userId, email, isAdmin, name, avatar, username`
   - Callback يتضمن: `userId, email, isAdmin` فقط
   - قد يسبب مشاكل في التطبيق إذا كان يعتمد على بيانات إضافية

## الحل المقترح

1. توحيد إعدادات الـ cookie بين Login و Callback
2. توحيد محتوى التوكن ليتضمن نفس البيانات
3. التأكد من أن `secure` يعتمد على البيئة في كلا الحالتين
4. استخدام `sameSite: 'lax'` في كلا الحالتين (لأن Google OAuth يتطلب ذلك)
