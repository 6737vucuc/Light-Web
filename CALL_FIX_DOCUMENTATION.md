# إصلاح مشكلة "Failed to call" في المكالمات الصوتية

## المشكلة
عند محاولة إجراء مكالمة صوتية في صفحة المحادثات الخاصة (Direct Messages)، كانت تظهر رسالة خطأ "Failed to call" ولا تتم المكالمة.

## السبب الجذري
كان الكود يُنشئ سجل مكالمة في قاعدة البيانات، لكنه **لم يكن يبدأ مكالمة PeerJS الفعلية**. كان التدفق:
1. المتصل يُنشئ سجل مكالمة في قاعدة البيانات ✓
2. المتصل ينتظر المستقبل أن يقبل ✗ (خطأ)
3. المستقبل لا يستقبل أي مكالمة PeerJS ✗

## الحل المطبق

### 1. إضافة عمود `current_peer_id` في جدول users
```sql
ALTER TABLE users ADD COLUMN current_peer_id VARCHAR(255) DEFAULT NULL;
CREATE INDEX idx_users_current_peer_id ON users(current_peer_id);
```

هذا العمود يخزن PeerID النشط لكل مستخدم متصل، ويُستخدم لإجراء المكالمات.

### 2. تحديث تهيئة PeerJS لحفظ PeerID
```typescript
peer.on('open', async (id) => { 
  console.log('PeerJS connected with ID:', id);
  setPeerId(id); 
  peerRef.current = peer;
  
  // Store PeerID in database for incoming calls
  try {
    await supabase
      .from('users')
      .update({ current_peer_id: id })
      .eq('id', currentUser.id);
    console.log('PeerID stored in database');
  } catch (err) {
    console.error('Failed to store PeerID:', err);
  }
});
```

### 3. تنظيف PeerID عند قطع الاتصال
```typescript
return () => { 
  // Clear PeerID from database on disconnect
  if (currentUser?.id) {
    supabase
      .from('users')
      .update({ current_peer_id: null })
      .eq('id', currentUser.id)
      .then(() => console.log('PeerID cleared from database'))
      .catch(err => console.error('Failed to clear PeerID:', err));
  }
  if (peer) peer.destroy(); 
};
```

### 4. إصلاح دالة startCall
التدفق الجديد الصحيح:
1. طلب إذن الميكروفون
2. إنشاء سجل مكالمة في قاعدة البيانات
3. **الحصول على PeerID الخاص بالمستقبل من قاعدة البيانات**
4. **إجراء مكالمة PeerJS الفعلية مباشرة**
5. إعداد معالجات أحداث المكالمة

```typescript
// Step 3: Get receiver's current PeerID
const { data: receiverData, error: receiverError } = await supabase
  .from('users')
  .select('id, name, current_peer_id')
  .eq('id', selectedConversation.other_user_id)
  .single();

if (receiverError || !receiverData?.current_peer_id) {
  throw new Error('Receiver is not online');
}

// Step 4: Make actual PeerJS call
const call = peerRef.current.call(receiverData.current_peer_id, stream);
currentCallRef.current = { call, callId: data.call.id };
setupCallEvents(call);
```

## التحسينات الإضافية

### 1. معالجة أخطاء محسّنة
- رسائل خطأ واضحة للمستخدم
- تحديد السبب الحقيقي للفشل (مستخدم غير متصل، خطأ في API، إلخ)

### 2. Logging محسّن
- إضافة console.log في كل خطوة لتتبع المشكلات
- تسمية واضحة مع prefix `[Call]`

### 3. التحقق من الحالة
- التحقق من وجود PeerID قبل بدء المكالمة
- التحقق من أن المستقبل متصل (لديه current_peer_id)

## الملفات المعدلة
1. `components/community/WhatsAppMessenger.tsx` - إصلاح منطق المكالمات
2. `migrations/add_peer_id_column.sql` - إضافة عمود current_peer_id

## كيفية تطبيق الإصلاح على قاعدة البيانات

### على Supabase (الإنتاج)
1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. قم بتشغيل محتوى ملف `migrations/add_peer_id_column.sql`

### محلياً (التطوير)
```bash
psql $DATABASE_URL -f migrations/add_peer_id_column.sql
```

## الاختبار
1. افتح صفحة المحادثات في متصفحين مختلفين
2. سجل دخول بحسابين مختلفين
3. ابدأ محادثة بين المستخدمين
4. اضغط على زر المكالمة
5. يجب أن يستقبل المستخدم الآخر المكالمة ويظهر له خيار القبول/الرفض

## ملاحظات مهمة
- يجب أن يكون كلا المستخدمين متصلين (online) لإجراء المكالمة
- يجب منح إذن الميكروفون في المتصفح
- المكالمات تعمل عبر WebRTC باستخدام PeerJS
- يتم استخدام خوادم STUN من Google للاتصال

## التحديثات المستقبلية المقترحة
1. إضافة مكالمات فيديو
2. إضافة إشعار صوتي عند استقبال مكالمة
3. إضافة سجل المكالمات في واجهة المستخدم
4. إضافة إمكانية كتم الصوت أثناء المكالمة
5. إضافة مؤشر جودة الاتصال

## الدعم
في حال واجهت أي مشاكل، تحقق من:
1. Console logs في المتصفح
2. أن المستخدم الآخر متصل
3. أن إذن الميكروفون ممنوح
4. أن قاعدة البيانات تحتوي على عمود current_peer_id

---
تاريخ الإصلاح: 2 فبراير 2026
المطور: Manus AI Assistant
