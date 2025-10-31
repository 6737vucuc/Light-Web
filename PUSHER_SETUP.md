# Pusher Setup Guide - إعداد Pusher للرسائل الفورية

## 📋 Overview

تم تكوين المشروع للعمل مع Pusher لتوفير الرسائل الفورية في:
- الدردشة الجماعية (Group Chat)
- الرسائل الخاصة (Private Messages)
- الإشعارات الفورية (Real-time Notifications)

---

## 🔑 Pusher Credentials

المعلومات المطلوبة:

```
App ID: 2061314
Key: b0f5756f20e894c0c2e7
Secret: 0af888670cc72dbbf5ab
Cluster: us2
```

---

## ⚙️ Setup Steps

### 1. إنشاء ملف `.env.local` في المشروع

قم بإنشاء ملف `.env.local` في الجذر الرئيسي للمشروع وأضف المتغيرات التالية:

```env
# Pusher Configuration
PUSHER_APP_ID=2061314
PUSHER_KEY=b0f5756f20e894c0c2e7
PUSHER_SECRET=0af888670cc72dbbf5ab
PUSHER_CLUSTER=us2

# Public Variables (accessible in browser)
NEXT_PUBLIC_PUSHER_APP_KEY=b0f5756f20e894c0c2e7
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

### 2. إعداد Vercel Environment Variables

في لوحة تحكم Vercel:

1. اذهب إلى **Settings** → **Environment Variables**
2. أضف المتغيرات التالية:

| Name | Value |
|------|-------|
| `PUSHER_APP_ID` | `2061314` |
| `PUSHER_KEY` | `b0f5756f20e894c0c2e7` |
| `PUSHER_SECRET` | `0af888670cc72dbbf5ab` |
| `PUSHER_CLUSTER` | `us2` |
| `NEXT_PUBLIC_PUSHER_APP_KEY` | `b0f5756f20e894c0c2e7` |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | `us2` |

3. اختر **Production**, **Preview**, و **Development** لكل متغير
4. احفظ التغييرات

### 3. إعادة نشر المشروع

بعد إضافة المتغيرات، قم بإعادة نشر المشروع:

```bash
git commit --allow-empty -m "Trigger redeploy for Pusher config"
git push origin main
```

أو من لوحة تحكم Vercel:
- اذهب إلى **Deployments**
- اضغط على **Redeploy** للنشر الأخير

---

## 📦 تثبيت Pusher في المشروع

تأكد من تثبيت مكتبات Pusher:

### للـ Backend (Server-side)
```bash
npm install pusher
```

### للـ Frontend (Client-side)
```bash
npm install pusher-js
```

---

## 🔧 كود التكامل

### Server-side (API Routes)

```typescript
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

// إرسال رسالة
await pusher.trigger('group-chat', 'new-message', {
  id: message.id,
  userId: user.id,
  userName: user.name,
  content: message.content,
  createdAt: message.createdAt
});
```

### Client-side (React Components)

```typescript
import Pusher from 'pusher-js';

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});

const channel = pusher.subscribe('group-chat');

channel.bind('new-message', (data: any) => {
  setMessages((prev) => [...prev, data]);
});
```

---

## ✅ التحقق من التكوين

### 1. اختبار الاتصال

قم بزيارة صفحة المجتمع وافتح الدردشة الجماعية:
- أرسل رسالة
- يجب أن تظهر الرسالة فوراً بدون تحديث الصفحة

### 2. فحص Console

افتح Developer Tools → Console:
- يجب أن ترى: `Pusher : State changed : connecting -> connected`
- لا يجب أن ترى أي أخطاء متعلقة بـ Pusher

### 3. Pusher Dashboard

في لوحة تحكم Pusher (https://dashboard.pusher.com):
- اذهب إلى **Debug Console**
- يجب أن ترى الأحداث تظهر عند إرسال الرسائل

---

## 🔍 Troubleshooting

### المشكلة: "Pusher connection failed"

**الحل:**
1. تأكد من صحة الـ credentials
2. تأكد من أن `NEXT_PUBLIC_*` متغيرات موجودة
3. أعد تشغيل الخادم المحلي
4. تحقق من أن Pusher app نشط في dashboard

### المشكلة: "Invalid key in Pusher constructor"

**الحل:**
1. تأكد من استخدام `NEXT_PUBLIC_PUSHER_APP_KEY` وليس `PUSHER_KEY`
2. أعد بناء المشروع: `npm run build`

### المشكلة: الرسائل لا تظهر فوراً

**الحل:**
1. تحقق من اتصال Pusher في Console
2. تأكد من أن Channel name متطابق في Server و Client
3. تحقق من Event name

---

## 📚 Channels المستخدمة

### 1. `group-chat` - الدردشة الجماعية
**Events:**
- `new-message` - رسالة جديدة
- `user-joined` - مستخدم انضم
- `user-left` - مستخدم غادر

### 2. `private-user-{userId}` - الرسائل الخاصة
**Events:**
- `new-message` - رسالة خاصة جديدة
- `message-read` - تم قراءة الرسالة

### 3. `notifications-{userId}` - الإشعارات
**Events:**
- `new-notification` - إشعار جديد

---

## 🔐 Security Notes

1. **لا تشارك `PUSHER_SECRET`** - هذا المفتاح للـ server فقط
2. **استخدم Private Channels** للرسائل الخاصة
3. **قم بالتحقق من المستخدم** قبل إرسال الرسائل
4. **لا ترفع `.env.local`** إلى Git

---

## 📊 Pusher Dashboard

للوصول إلى لوحة التحكم:
1. اذهب إلى: https://dashboard.pusher.com
2. سجل الدخول بحسابك
3. اختر App: Light-Web (أو اسم التطبيق)
4. يمكنك مراقبة:
   - عدد الاتصالات النشطة
   - الرسائل المرسلة
   - الأخطاء
   - الإحصائيات

---

## 🎯 Next Steps

بعد إعداد Pusher:

1. ✅ اختبر الدردشة الجماعية
2. ✅ اختبر الرسائل الخاصة
3. ✅ اختبر الإشعارات الفورية
4. ✅ راقب الأداء في Pusher Dashboard
5. ✅ تأكد من عدم وجود أخطاء في Console

---

## 📞 Support

إذا واجهت أي مشاكل:
- Pusher Documentation: https://pusher.com/docs
- Pusher Support: https://support.pusher.com

---

**الآن الرسائل الفورية جاهزة للعمل! 🚀**
