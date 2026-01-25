# دليل إعداد البريد الإلكتروني - Email Setup Guide

## 📧 الخدمات المدعومة

يدعم النظام جميع خدمات البريد الإلكتروني الشهيرة:

1. ✅ **Gmail** (Google)
2. ✅ **Outlook** (Microsoft)
3. ✅ **Yahoo Mail**
4. ✅ **Custom SMTP** (أي سيرفر SMTP)

---

## 🔧 الإعداد

### متغيرات البيئة المطلوبة

أضف هذه المتغيرات في ملف `.env`:

```env
# اختر الخدمة: gmail, outlook, yahoo, أو custom
EMAIL_SERVICE=gmail

# بريدك الإلكتروني
EMAIL_USER=your-email@gmail.com

# كلمة المرور أو App Password
EMAIL_PASS=your-app-password

# رابط الموقع (للروابط في الإيميل)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 1️⃣ Gmail

### الخطوات:

#### 1. تفعيل 2-Step Verification
1. اذهب إلى: https://myaccount.google.com/security
2. ابحث عن "2-Step Verification"
3. فعّله إذا لم يكن مفعلاً

#### 2. إنشاء App Password
1. بعد تفعيل 2-Step Verification
2. اذهب إلى: https://myaccount.google.com/apppasswords
3. اختر "Mail" و "Other (Custom name)"
4. اكتب اسم: "Light of Life VPN Alerts"
5. اضغط "Generate"
6. انسخ الباسورد المكون من 16 حرف (مثل: `abcd efgh ijkl mnop`)

#### 3. إعدادات `.env`
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

**ملاحظة:** احذف المسافات من App Password عند نسخه!

---

## 2️⃣ Outlook / Hotmail

### الخطوات:

#### 1. تفعيل 2-Step Verification
1. اذهب إلى: https://account.microsoft.com/security
2. ابحث عن "Two-step verification"
3. فعّله إذا لم يكن مفعلاً

#### 2. إنشاء App Password
1. في نفس صفحة Security
2. اذهب إلى "Advanced security options"
3. ابحث عن "App passwords"
4. اضغط "Create a new app password"
5. انسخ الباسورد الذي يظهر

#### 3. إعدادات `.env`
```env
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-app-password
```

**يعمل مع:**
- @outlook.com
- @hotmail.com
- @live.com

---

## 3️⃣ Yahoo Mail

### الخطوات:

#### 1. إنشاء App Password
1. اذهب إلى: https://login.yahoo.com/account/security
2. ابحث عن "Generate app password"
3. اختر "Other App"
4. اكتب اسم: "Light of Life"
5. اضغط "Generate"
6. انسخ الباسورد

#### 2. إعدادات `.env`
```env
EMAIL_SERVICE=yahoo
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

---

## 4️⃣ Custom SMTP (أي سيرفر)

إذا كنت تستخدم سيرفر SMTP خاص (مثل: cPanel, Plesk, AWS SES, SendGrid):

### إعدادات `.env`
```env
EMAIL_SERVICE=custom
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=your-password
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
```

### معلومات SMTP الشائعة:

#### cPanel / Plesk
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
```

---

## 🧪 اختبار الإعداد

### 1. تأكد من المتغيرات
تحقق من أن جميع المتغيرات موجودة في `.env`:
```bash
cat .env | grep EMAIL
```

### 2. أعد تشغيل المشروع
```bash
pnpm dev
```

### 3. اختبر إرسال إيميل
1. سجل دخول مع VPN مفعّل
2. يجب أن يصلك إيميل تحذيري خلال ثوانٍ

---

## ❓ حل المشاكل الشائعة

### 1. "Invalid login" أو "Authentication failed"
**الحل:**
- تأكد من App Password صحيح (ليس الباسورد العادي)
- تأكد من عدم وجود مسافات في App Password
- تأكد من تفعيل 2-Step Verification

### 2. "Connection timeout"
**الحل:**
- تأكد من SMTP_HOST صحيح
- تأكد من SMTP_PORT صحيح (587 أو 465)
- جرب تغيير SMTP_SECURE من false إلى true أو العكس

### 3. "Self-signed certificate"
**الحل:**
أضف هذا للـ transportConfig في الكود:
```typescript
tls: {
  rejectUnauthorized: false
}
```

### 4. الإيميل يذهب إلى Spam
**الحل:**
- استخدم بريد إلكتروني موثوق (Gmail, Outlook)
- أضف SPF و DKIM records لدومينك
- استخدم خدمة SMTP احترافية (SendGrid, AWS SES)

---

## 📊 مقارنة الخدمات

| الخدمة | الحد اليومي | السرعة | الموثوقية | التكلفة |
|--------|------------|---------|-----------|---------|
| **Gmail** | 500 إيميل/يوم | سريع | ⭐⭐⭐⭐⭐ | مجاني |
| **Outlook** | 300 إيميل/يوم | سريع | ⭐⭐⭐⭐ | مجاني |
| **Yahoo** | 500 إيميل/يوم | متوسط | ⭐⭐⭐ | مجاني |
| **SendGrid** | 100 إيميل/يوم | سريع جداً | ⭐⭐⭐⭐⭐ | مجاني ثم مدفوع |
| **AWS SES** | غير محدود | سريع جداً | ⭐⭐⭐⭐⭐ | $0.10/1000 إيميل |

---

## 🎯 التوصيات

### للمشاريع الصغيرة (< 100 مستخدم/يوم)
✅ استخدم **Gmail** أو **Outlook**
- سهل الإعداد
- مجاني
- موثوق

### للمشاريع المتوسطة (100-1000 مستخدم/يوم)
✅ استخدم **SendGrid** أو **Mailgun**
- حد أعلى
- إحصائيات مفصلة
- دعم فني

### للمشاريع الكبيرة (> 1000 مستخدم/يوم)
✅ استخدم **AWS SES** أو **Postmark**
- غير محدود
- سريع جداً
- موثوقية عالية

---

## 📝 أمثلة كاملة

### مثال 1: Gmail
```env
EMAIL_SERVICE=gmail
EMAIL_USER=lightoflife@gmail.com
EMAIL_PASS=abcdefghijklmnop
NEXT_PUBLIC_APP_URL=https://lightoflife.com
```

### مثال 2: Outlook
```env
EMAIL_SERVICE=outlook
EMAIL_USER=admin@outlook.com
EMAIL_PASS=your-app-password
NEXT_PUBLIC_APP_URL=https://lightoflife.com
```

### مثال 3: Custom SMTP (cPanel)
```env
EMAIL_SERVICE=custom
EMAIL_USER=noreply@lightoflife.com
EMAIL_PASS=your-password
SMTP_HOST=mail.lightoflife.com
SMTP_PORT=587
SMTP_SECURE=false
NEXT_PUBLIC_APP_URL=https://lightoflife.com
```

---

## 🔒 نصائح الأمان

1. ✅ **لا تشارك App Password** مع أحد
2. ✅ **استخدم App Password** وليس الباسورد العادي
3. ✅ **لا ترفع `.env`** على GitHub
4. ✅ **أضف `.env` في `.gitignore`**
5. ✅ **غيّر App Password** بشكل دوري
6. ✅ **استخدم متغيرات البيئة** في Vercel/Netlify

---

## 🚀 جاهز للاستخدام!

بعد إعداد البريد الإلكتروني:
1. ✅ سيتم إرسال إيميلات تحذيرية تلقائياً
2. ✅ عند كشف VPN
3. ✅ بتصميم احترافي
4. ✅ باللغة الإنجليزية

**استمتع بنظام VPN الآمن! 🎉**
