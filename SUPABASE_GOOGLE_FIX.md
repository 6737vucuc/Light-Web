# حل مشكلة "Unsupported provider: provider is not enabled"

هذا الخطأ يظهر لأن خدمة تسجيل الدخول بواسطة Google غير مفعلة في لوحة تحكم Supabase، أو أنها مفعلة ولكن بدون إدخال بيانات Google (Client ID & Client Secret).

## 🛠 الخطوات المطلوبة لحل المشكلة

### الخطوة 1: الحصول على بيانات Google OAuth
إذا لم يكن لديك Client ID و Client Secret من Google:
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/).
2. أنشئ مشروعاً جديداً.
3. اذهب إلى **APIs & Services** > **OAuth consent screen** وأكمل الإعدادات (اختر External).
4. اذهب إلى **Credentials** > **Create Credentials** > **OAuth client ID**.
5. اختر النوع **Web application**.
6. في خانة **Authorized redirect URIs** أضف هذا الرابط (مهم جداً):
   `https://lzqyucohnjtubivlmdkw.supabase.co/auth/v1/callback`
7. اضغط Create وانسخ الـ **Client ID** والـ **Client Secret**.

### الخطوة 2: تفعيل Google في Supabase
1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard).
2. اختر مشروعك `lzqyucohnjtubivlmdkw`.
3. من القائمة الجانبية، اختر **Authentication** > **Providers**.
4. ابحث عن **Google** واضغط عليه لتوسيع الإعدادات.
5. قم بتفعيل الخيار **"Enable Google Provider"**.
6. أدخل الـ **Client ID** والـ **Client Secret** اللذين حصلت عليهما من Google في الخطوة السابقة.
7. اضغط على **Save**.

### الخطوة 3: إضافة روابط إعادة التوجيه (Redirect URLs) في Supabase
في نفس صفحة الـ Authentication في Supabase:
1. اذهب إلى **URL Configuration** (أو Site URL).
2. تأكد من أن **Site URL** هو رابط موقعك على Vercel:
   `https://light-web-project.vercel.app`
3. في خانة **Redirect URLs**، أضف الروابط التالية:
   - `https://light-web-project.vercel.app/**`
   - `http://localhost:3000/**`

---

## 💡 لماذا ظهر هذا الخطأ؟
عندما تضغط على زر "Sign in with Google"، يقوم الكود بإرسال طلب إلى Supabase لبدء عملية تسجيل الدخول. إذا كان خيار Google غير مفعل (Enabled) داخل Supabase، سيرد Supabase بهذا الخطأ:
`"msg": "Unsupported provider: provider is not enabled"`

## ✅ بعد تنفيذ هذه الخطوات
بمجرد تفعيل الخيار في Supabase وحفظ البيانات، سيعمل الزر فوراً دون الحاجة لتغيير أي كود إضافي، لأن الكود الذي رفعته لك سابقاً جاهز تماماً للتعامل مع الطلب.

---
**ملاحظة:** تأكد أيضاً من إضافة المتغيرات البيئية (Environment Variables) على Vercel كما شرحت لك في الملف السابق `VERCEL_SETUP_GUIDE.md`.
