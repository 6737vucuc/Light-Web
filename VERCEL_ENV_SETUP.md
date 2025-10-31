# إعداد المتغيرات البيئية على Vercel

## خطوات الإعداد

1. اذهب إلى https://vercel.com/dashboard
2. اختر مشروعك **Light-Web**
3. اذهب إلى **Settings** → **Environment Variables**
4. أضف المتغيرات التالية واحدة تلو الأخرى:

---

## المتغيرات المطلوبة

### 1. Database (Neon PostgreSQL)
```
Name: DATABASE_URL
Value: postgresql://neondb_owner:npg_Hf73CljbDXzF@ep-fancy-forest-aedpagn2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
Environment: Production, Preview, Development
```

### 2. Cloudinary (Image & Video Storage)
```
Name: CLOUDINARY_CLOUD_NAME
Value: dju50upuw
Environment: Production, Preview, Development
```

```
Name: CLOUDINARY_API_KEY
Value: 865927968512142
Environment: Production, Preview, Development
```

```
Name: CLOUDINARY_API_SECRET
Value: SdfoH8iC4xi_2joit-mcP0c1DBQ
Environment: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
Value: dju50upuw
Environment: Production, Preview, Development
```

### 3. Pusher (Real-time messaging)
```
Name: PUSHER_APP_ID
Value: 2061314
Environment: Production, Preview, Development
```

```
Name: PUSHER_KEY
Value: b0f5756f20e894c0c2e7
Environment: Production, Preview, Development
```

```
Name: PUSHER_SECRET
Value: 0af888670cc72dbbf5ab
Environment: Production, Preview, Development
```

```
Name: PUSHER_CLUSTER
Value: us2
Environment: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_PUSHER_APP_KEY
Value: b0f5756f20e894c0c2e7
Environment: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_PUSHER_CLUSTER
Value: us2
Environment: Production, Preview, Development
```

### 4. Email Configuration (Nodemailer)
```
Name: EMAIL_USER
Value: noreplylightoflife@gmail.com
Environment: Production, Preview, Development
```

```
Name: EMAIL_PASS
Value: cabjjzptfsxnzxlr
Environment: Production, Preview, Development
```

### 5. JWT Secret
```
Name: JWT_SECRET
Value: 40ade169e4af9a22a65ee4c1c776cd9ecb6c98ef5a43d94ea818f8ec3401af72aa76442d047f38a8e99b568535d9a33aaeb25c768568b790c477f09dbf27bfd9
Environment: Production, Preview, Development
```

### 6. App URL
```
Name: NEXT_PUBLIC_APP_URL
Value: https://light-web-project-3xz0dhfao-anwar-kouns-projects.vercel.app
Environment: Production, Preview, Development
```

---

## بعد إضافة المتغيرات

1. اذهب إلى **Deployments**
2. اضغط على **Redeploy** للنشر الأخير
3. اختر **Redeploy with existing Build Cache**
4. انتظر حتى يكتمل النشر
5. جرب التسجيل مرة أخرى

---

## ملاحظات مهمة

- تأكد من اختيار جميع البيئات (Production, Preview, Development) لكل متغير
- بعد إضافة المتغيرات، يجب إعادة نشر المشروع لتفعيلها
- إذا استمرت المشكلة، تحقق من أن قاعدة البيانات Neon تعمل بشكل صحيح
