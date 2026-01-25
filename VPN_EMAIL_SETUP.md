# إعداد بريد VPN Alerts - Outlook

## 📧 المعلومات المطلوبة

أضف هذه المتغيرات في ملف `.env` (أو في Vercel Environment Variables):

```env
# VPN Alert Email Configuration (Outlook)
VPN_EMAIL_SERVICE=outlook
VPN_EMAIL_USER=secure-team-lightoflife@outlook.com
VPN_EMAIL_PASS=knqkzlwnorhyhaeg
```

---

## 🔧 الإعداد الكامل

### في ملف `.env` المحلي:

```env
# ============================================
# Email Configuration for OTP/Verification
# ============================================
EMAIL_SERVICE=gmail
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password

# ============================================
# VPN Alert Email Configuration (Outlook)
# ============================================
VPN_EMAIL_SERVICE=outlook
VPN_EMAIL_USER=secure-team-lightoflife@outlook.com
VPN_EMAIL_PASS=knqkzlwnorhyhaeg

# ============================================
# Other Settings
# ============================================
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 🚀 في Vercel Environment Variables:

اذهب إلى: **Vercel Dashboard → Your Project → Settings → Environment Variables**

أضف:

| Name | Value |
|------|-------|
| `VPN_EMAIL_SERVICE` | `outlook` |
| `VPN_EMAIL_USER` | `secure-team-lightoflife@outlook.com` |
| `VPN_EMAIL_PASS` | `knqkzlwnorhyhaeg` |

**ملاحظة:** تأكد من اختيار **Production, Preview, Development** لكل متغير!

---

## ✅ كيف يعمل النظام الآن:

### 1. رموز التحقق (OTP)
- **الخدمة:** Gmail
- **المتغيرات:** `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS`
- **يُستخدم في:**
  - تسجيل حساب جديد
  - تسجيل الدخول
  - إعادة تعيين كلمة المرور

### 2. تحذيرات VPN
- **الخدمة:** Outlook
- **المتغيرات:** `VPN_EMAIL_SERVICE`, `VPN_EMAIL_USER`, `VPN_EMAIL_PASS`
- **يُستخدم في:**
  - كشف VPN/Proxy
  - إرسال تحذيرات أمنية
  - إشعارات المخاطر

---

## 📧 مثال على الإيميل المُرسل:

**From:** Light of Life Security <secure-team-lightoflife@outlook.com>  
**To:** user@example.com  
**Subject:** ⚠️ Security Warning - VPN/Proxy Detected

```
⚠️ Security Warning
VPN/Proxy Detected

Hello [User Name],

An attempt to access your account using VPN or Proxy has been detected.

📋 Detection Details:
- IP Address: xxx.xxx.xxx.xxx
- Location: City, Country
- ISP: Provider Name
- Detection Type: VPN

🛡️ Why do we block VPN?
1. Privacy Protection
2. Fraud Prevention
3. Security
4. Compliance

✅ What should you do?
1. Turn off VPN/Proxy
2. Restart your browser
3. Sign in again

⚠️ Warning: Continuing to attempt access using VPN may result in temporary account suspension.

[Back to Site]
```

---

## 🧪 اختبار الإعداد

### 1. تأكد من إضافة المتغيرات
```bash
# في المشروع المحلي
cat .env | grep VPN_EMAIL
```

### 2. أعد تشغيل المشروع
```bash
pnpm dev
```

### 3. اختبر إرسال إيميل
1. سجل دخول مع VPN مفعّل
2. يجب أن يصل إيميل من `secure-team-lightoflife@outlook.com`
3. تحقق من صندوق الوارد (أو Spam)

---

## ❓ حل المشاكل

### 1. الإيميل لا يصل
**الحل:**
- تأكد من App Password صحيح: `knqkzlwnorhyhaeg`
- تأكد من الإيميل صحيح: `secure-team-lightoflife@outlook.com`
- تحقق من Vercel Environment Variables

### 2. "Authentication failed"
**الحل:**
- تأكد من Two-step verification مفعّل في Outlook
- جرب إنشاء App Password جديد
- تأكد من عدم وجود مسافات في الباسورد

### 3. الإيميل يذهب إلى Spam
**الحل:**
- هذا طبيعي في البداية
- بعد عدة إيميلات، سيتعرف Gmail/Outlook عليه
- يمكنك إضافة SPF record لدومينك

---

## 🔒 نصائح الأمان

1. ✅ **لا تشارك App Password** مع أحد
2. ✅ **لا ترفع `.env`** على GitHub
3. ✅ **استخدم Vercel Environment Variables** في Production
4. ✅ **غيّر App Password** إذا تم تسريبه
5. ✅ **راقب نشاط الحساب** في Outlook Security

---

## 📊 الإحصائيات المتوقعة

### حدود Outlook:
- **الحد اليومي:** 300 إيميل/يوم
- **الحد في الساعة:** 50 إيميل/ساعة
- **الحد في الدقيقة:** 10 إيميل/دقيقة

### إذا تجاوزت الحد:
- استخدم خدمة احترافية مثل SendGrid أو AWS SES
- أو استخدم عدة حسابات Outlook

---

## ✨ جاهز!

الآن نظام VPN Alerts يعمل بشكل كامل:
- ✅ كشف VPN تلقائي
- ✅ إرسال إيميلات من Outlook
- ✅ تصميم احترافي
- ✅ لوحة تحكم شاملة

**استمتع بنظام الأمان المتقدم! 🎉**
