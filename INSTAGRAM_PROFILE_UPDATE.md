# Instagram-Style Profile Update 🎨

## Overview
تم تحديث نظام الملف الشخصي ليكون شبيهاً تماماً بالإنستغرام مع جميع الميزات والوظائف الحديثة.

---

## ✨ New Features

### 1. Instagram-Style Profile Page

#### Profile Header
- **صورة الغلاف (Cover Photo)**: إمكانية رفع وتغيير صورة الغلاف
- **الصورة الشخصية (Avatar)**: صورة دائرية مع إمكانية التحديث
- **المعلومات الأساسية**:
  - الاسم الكامل
  - اسم المستخدم (@username)
  - البايو (Bio)
  - الموقع الإلكتروني
  - أيقونة القفل للحسابات الخاصة

#### Statistics
- عدد المنشورات (Posts Count)
- عدد المتابعين (Followers Count)
- عدد المتابعة (Following Count)
- إمكانية إخفاء الإحصائيات حسب إعدادات الخصوصية

#### Action Buttons
**للملف الشخصي الخاص:**
- Edit Profile (تعديل الملف الشخصي)
- Settings (الإعدادات)

**لملفات المستخدمين الآخرين:**
- Follow / Following / Requested (متابعة / يتابع / طلب معلق)
- Message (إرسال رسالة)
- More Options (المزيد):
  - Share Profile (مشاركة الملف الشخصي)
  - Block User (حظر المستخدم)
  - Report (الإبلاغ)

---

### 2. Profile Tabs (التبويبات)

#### 📱 Posts Tab
- عرض المنشورات بشكل Grid (3 أعمدة)
- عرض عدد الإعجابات والتعليقات عند التمرير
- تأثيرات حركية عند النقر

#### 📚 Lessons Tab (جديد!)
- **إحصائيات الدروس**:
  - إجمالي الدروس
  - الدروس المكتملة
  - الدروس قيد التقدم
  - نسبة الإنجاز
- **شريط التقدم الإجمالي**
- **قائمة الدروس** مع:
  - صورة الدرس
  - العنوان
  - حالة الإنجاز
  - نسبة التقدم
  - تاريخ آخر مشاهدة

#### 🏷️ Tagged Tab
- المنشورات التي تم الإشارة إلى المستخدم فيها
- عرض Grid مشابه للمنشورات

#### 🔖 Saved Tab (للمالك فقط)
- المنشورات المحفوظة
- خاص بالمستخدم فقط

---

### 3. Username Change System (تغيير اسم المستخدم)

#### Features
- **تغيير اسم المستخدم من الملف الشخصي**
- **قيود الأمان**:
  - لا يمكن تغيير اسم المستخدم إلا مرة كل 30 يوم
  - عرض عدد الأيام المتبقية حتى التغيير التالي
  - التحقق من توفر اسم المستخدم
  - يجب أن يكون 3 أحرف على الأقل
  - يقبل فقط الحروف والأرقام والشرطة السفلية

#### API Endpoint
```
PUT /api/profile/username
Body: { username: "new_username" }
```

---

### 4. Privacy System (نظام الخصوصية)

#### Privacy Settings
- **حساب خاص (Private Account)**:
  - عند التفعيل، لا يمكن لغير المتابعين رؤية المنشورات
  - يجب إرسال طلب متابعة والموافقة عليه
  - رسالة "This Account is Private" للزوار
  
- **إخفاء المتابعين (Hide Followers)**
- **إخفاء المتابعة (Hide Following)**
- **التحكم في التعليقات (Allow Comments)**
- **التحكم في الرسائل (Allow Messages)**

#### API Endpoint
```
PUT /api/profile/privacy
Body: {
  isPrivate: boolean,
  hideFollowers: boolean,
  hideFollowing: boolean,
  allowComments: "everyone" | "followers" | "nobody",
  allowMessages: "everyone" | "followers" | "nobody"
}
```

---

### 5. Stories System (نظام الستوريات)

#### Features
- **عرض الستوريات** في شريط أفقي أعلى الصفحة
- **إضافة ستوري جديد**:
  - صورة أو فيديو
  - إضافة تعليق (Caption)
  - تنتهي تلقائياً بعد 24 ساعة
  
- **عرض الستوريات**:
  - شاشة كاملة
  - شريط تقدم لكل ستوري
  - التنقل بالنقر (يمين/يسار)
  - عرض الوقت
  - عرض عدد المشاهدات (للمالك فقط)
  
- **التصميم**:
  - دائرة ملونة (Gradient) للستوريات غير المشاهدة
  - دائرة رمادية للستوريات المشاهدة
  - زر + لإضافة ستوري جديد

#### API Endpoints
```
GET  /api/stories                    - Get all active stories
POST /api/stories                    - Create new story
POST /api/stories/[storyId]/view    - Mark story as viewed
DELETE /api/stories?storyId=123     - Delete story
```

---

### 6. Follow System (نظام المتابعة)

#### Features
- **متابعة فورية** للحسابات العامة
- **طلب متابعة** للحسابات الخاصة
- **حالات الأزرار**:
  - Follow (متابعة)
  - Following (يتابع)
  - Requested (طلب معلق)
  
#### API Endpoints
```
POST   /api/follow/[userId]              - Follow user
DELETE /api/follow/[userId]              - Unfollow user
GET    /api/follow/status/[userId]       - Check follow status
GET    /api/follow/followers/[userId]    - Get followers list
GET    /api/follow/following/[userId]    - Get following list
```

---

### 7. Block System (نظام الحظر)

#### Features
- **حظر المستخدمين**
- **المستخدمون المحظورون**:
  - لا يمكنهم رؤية الملف الشخصي
  - لا يمكنهم إرسال رسائل
  - لا يمكنهم رؤية المنشورات
  
#### API Endpoints
```
POST   /api/privacy/block/[userId]    - Block user
DELETE /api/privacy/block/[userId]    - Unblock user
GET    /api/privacy/blocked            - Get blocked users list
```

---

## 🎨 UI/UX Improvements

### Design Elements
- **Gradient Colors**: استخدام تدرجات لونية من البنفسجي إلى الأزرق
- **Smooth Animations**: تأثيرات حركية سلسة
- **Responsive Design**: متجاوب مع جميع الشاشات
- **Modern Cards**: بطاقات عصرية مع ظلال
- **Hover Effects**: تأثيرات عند التمرير

### Color Scheme
- Primary: Purple (#9333EA) to Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Orange (#F59E0B)
- Danger: Red (#EF4444)
- Gray Scale: من #F9FAFB إلى #111827

---

## 📱 Components Structure

```
app/
├── profile/
│   └── page.tsx                    # Own profile page
├── user-profile/
│   └── [userId]/
│       └── page.tsx                # Other users profile page
└── api/
    ├── profile/
    │   ├── route.ts               # Get/Update profile
    │   ├── username/route.ts      # Update username
    │   ├── privacy/route.ts       # Privacy settings
    │   ├── avatar/route.ts        # Update avatar
    │   └── cover/route.ts         # Update cover photo
    ├── posts/
    │   ├── user/[userId]/route.ts # Get user posts
    │   ├── saved/route.ts         # Saved posts
    │   └── tagged/[userId]/route.ts # Tagged posts
    ├── stories/
    │   ├── route.ts               # Stories CRUD
    │   └── [storyId]/view/route.ts # Mark as viewed
    ├── follow/
    │   ├── [userId]/route.ts      # Follow/Unfollow
    │   └── status/[userId]/route.ts # Follow status
    └── lessons/
        └── progress/
            └── user/[userId]/route.ts # User lesson progress

components/
└── stories/
    └── StoriesBar.tsx             # Stories component
```

---

## 🔒 Security Features

### Username Change Protection
- 30-day cooldown period
- Validation for format and length
- Duplicate check

### Privacy Controls
- Private account support
- Follow request system
- Block functionality
- Content visibility control

### Data Protection
- JWT authentication
- User ownership verification
- Privacy checks on all endpoints

---

## 📊 Database Schema Updates

### Users Table
- `username` - Unique username
- `username_last_changed` - Timestamp of last username change
- `cover_photo` - Cover photo URL
- `bio` - User biography
- `website` - Website URL
- `posts_count` - Number of posts
- `followers_count` - Number of followers
- `following_count` - Number of following
- `is_private` - Private account flag
- `hide_followers` - Hide followers flag
- `hide_following` - Hide following flag

### Stories Table
- `id` - Primary key
- `user_id` - Story owner
- `media_url` - Media URL
- `media_type` - 'image' or 'video'
- `caption` - Story caption
- `views_count` - Number of views
- `expires_at` - Expiration timestamp (24h)
- `created_at` - Creation timestamp

### Story Views Table
- `id` - Primary key
- `story_id` - Reference to story
- `user_id` - Viewer user ID
- `viewed_at` - View timestamp

### Follows Table
- `id` - Primary key
- `follower_id` - User who follows
- `following_id` - User being followed
- `status` - 'pending' or 'accepted'
- `created_at` - Follow timestamp

### Blocked Users Table
- `id` - Primary key
- `user_id` - User who blocks
- `blocked_user_id` - Blocked user
- `created_at` - Block timestamp

---

## 🚀 Usage Examples

### Viewing Own Profile
```
Navigate to: /profile
```

### Viewing Other User's Profile
```
Navigate to: /user-profile/[userId]
```

### Changing Username
1. Go to profile page
2. Click on username edit icon
3. Enter new username
4. Click "Save Username"
5. Wait 30 days before next change

### Adding a Story
1. Click on "+ Add Story" button
2. Select image or video
3. Add caption (optional)
4. Click "Share Story"
5. Story will expire after 24 hours

### Following a User
1. Visit user's profile
2. Click "Follow" button
3. If private account, wait for approval
4. If public account, follow immediately

---

## 📝 Notes

- جميع الميزات متوافقة مع قاعدة البيانات الحالية
- تم الحفاظ على التوافق مع الكود القديم
- تم إضافة التحقق من الصلاحيات في جميع API endpoints
- تم تحسين الأداء باستخدام الاستعلامات المحسنة
- تم إضافة معالجة الأخطاء الشاملة

---

## 🔄 Future Enhancements

- [ ] Story replies
- [ ] Story reactions
- [ ] Story highlights
- [ ] Close friends list for stories
- [ ] Direct messaging system (DMs)
- [ ] Message reactions
- [ ] Voice messages
- [ ] Video calls
- [ ] Live streaming

---

## 📞 Support

For any issues or questions, please refer to the project documentation or contact the development team.

---

**Version**: 2.0.0  
**Last Updated**: November 2, 2025  
**Author**: Manus AI Development Team
