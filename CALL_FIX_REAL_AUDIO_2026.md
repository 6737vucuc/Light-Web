# إصلاح مشكلة زر الاستجابة وبث الصوت الحقيقي في المكالمات

## تاريخ الإصلاح
8 فبراير 2026

## المشكلة المبلغ عنها
عند الانضمام إلى مجموعة ومراسلة شخص والاتصال به، زر الاستجابة (Accept) لا يعمل لربط المكالمات وبث الصوت الحقيقي.

## السبب الجذري

### المشكلة الأساسية
المتصل (Caller) كان يرسل إشعار عبر Supabase Realtime فقط، ولكنه **لم يبدأ مكالمة PeerJS حقيقية**. هذا يعني:
1. المستقبل يستقبل إشعار "incoming call"
2. المستقبل يضغط على زر Accept
3. لا توجد مكالمة PeerJS فعلية للإجابة عليها ❌
4. محاولة إنشاء مكالمة عكسية تفشل بسبب مشاكل التوقيت ❌

### المشكلة الثانوية
الكود لم يكن يخزن `current_peer_id` في جدول `users` عند إنشاء PeerJS connection، مما يجعل من المستحيل معرفة PeerID الخاص بالمستخدمين الآخرين.

## الإصلاحات المطبقة

### 1. تخزين PeerID في قاعدة البيانات

**الملف**: `components/community/WhatsAppMessenger.tsx`

**التغيير**: عند إنشاء PeerJS connection، يتم الآن تخزين PeerID في `users.current_peer_id`:

```typescript
peer.on('open', async (id) => {
  console.log('PeerJS connected with ID:', id);
  setPeerId(id);
  peerRef.current = peer;
  peerInstance = peer;
  retryCount = 0;
  
  // ✅ تخزين PeerID في قاعدة البيانات
  try {
    await supabase
      .from('users')
      .update({ current_peer_id: id })
      .eq('id', currentUser.id);
    console.log('PeerID stored in database:', id);
  } catch (err) {
    console.error('Failed to store PeerID:', err);
  }
});
```

**التنظيف عند قطع الاتصال**:
```typescript
return () => {
  // ✅ حذف PeerID من قاعدة البيانات عند قطع الاتصال
  if (currentUser?.id) {
    supabase
      .from('users')
      .update({ current_peer_id: null })
      .eq('id', currentUser.id)
      .then(() => console.log('PeerID cleared from database'))
      .catch(err => console.error('Failed to clear PeerID:', err));
  }
  if (peerInstance) {
    peerInstance.destroy();
    peerRef.current = null;
  }
};
```

### 2. إصلاح handleStartCall - بدء مكالمة PeerJS حقيقية

**التدفق الجديد**:

```typescript
const handleStartCall = async () => {
  if (!selectedConversation) return;
  
  // 1. تعيين حالة UI
  setCallOtherUser({ name: selectedConversation.name, avatar: selectedConversation.avatar });
  setCallStatus('calling');

  try {
    // 2. التحقق من وجود PeerJS connection
    if (!peerId || !peerRef.current || peerRef.current.destroyed) {
      toast.error('Connection not ready. Please try again.');
      setCallStatus('idle');
      return;
    }

    // 3. طلب إذن الميكروفون
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
    });
    localStreamRef.current = stream;
    console.log('[Call] Microphone access granted');

    // 4. ✅ الحصول على PeerID الخاص بالمستقبل من قاعدة البيانات
    const { data: receiverData, error: receiverError } = await supabase
      .from('users')
      .select('id, name, current_peer_id')
      .eq('id', selectedConversation.other_user_id)
      .single();

    if (receiverError || !receiverData?.current_peer_id) {
      throw new Error('Receiver is not online or not available for calls');
    }

    console.log('[Call] Receiver PeerID:', receiverData.current_peer_id);

    // 5. إرسال إشعار عبر Supabase Realtime
    await fetch('/api/calls/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId: selectedConversation.other_user_id,
        callerPeerId: peerId,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatar
      })
    });

    console.log('[Call] Supabase notification sent');

    // 6. ✅ بدء مكالمة PeerJS الفعلية فوراً
    const call = peerRef.current.call(receiverData.current_peer_id, stream);
    currentCallRef.current = call;
    console.log('[Call] PeerJS call initiated to:', receiverData.current_peer_id);

    // 7. إعداد معالجات أحداث المكالمة
    setupCallEvents(call);

  } catch (err: any) {
    console.error('[Call] Error:', err);
    toast.error(err.message || 'Failed to start call');
    
    // التنظيف عند حدوث خطأ
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setCallStatus('idle');
  }
};
```

**الفرق الرئيسي**:
- ✅ يتم الآن الحصول على `current_peer_id` للمستقبل من قاعدة البيانات
- ✅ يتم بدء مكالمة PeerJS حقيقية باستخدام `peerRef.current.call(receiverPeerId, stream)`
- ✅ يتم حفظ مرجع المكالمة في `currentCallRef.current`
- ✅ يتم إعداد معالجات الأحداث فوراً

### 3. تبسيط handleAcceptCall

**التدفق الجديد**:

```typescript
const handleAcceptCall = async () => {
  const callerPeerId = (window as any).incomingPeerId;
  const callerId = (window as any).incomingCallerId;
  
  console.log('[Call] Accepting call from:', callerId, 'with PeerID:', callerPeerId);

  try {
    // 1. التحقق من وجود PeerJS connection
    if (!peerId || !peerRef.current || peerRef.current.destroyed) {
      toast.error('Connection not ready. Please try again.');
      setCallStatus('idle');
      return;
    }

    // 2. طلب إذن الميكروفون
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
    });
    localStreamRef.current = stream;
    console.log('[Call] Microphone access granted for receiver');
    
    // 3. ✅ الإجابة على المكالمة الواردة إذا كانت موجودة
    if (currentCallRef.current) {
      console.log('[Call] Answering existing PeerJS call');
      currentCallRef.current.answer(stream);
      setupCallEvents(currentCallRef.current);
    } else {
      console.log('[Call] No incoming call object yet, waiting for PeerJS call event...');
      // سيتم الإجابة تلقائياً في معالج peer.on('call')
    }
    
    // 4. إرسال إشعار القبول عبر Supabase Realtime
    await fetch('/api/calls/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        receiverId: callerId,
        receiverPeerId: peerId
      })
    });
    
    console.log('[Call] Acceptance notification sent');
    setCallStatus('connected');

  } catch (err: any) {
    console.error('[Call] Accept error:', err);
    toast.error(err.message || 'Could not connect call');
    
    // التنظيف عند حدوث خطأ
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setCallStatus('idle');
  }
};
```

**التحسينات**:
- ✅ إزالة الكود المعقد لإنشاء PeerJS connection جديد
- ✅ الاعتماد على PeerJS connection الموجود
- ✅ الإجابة على المكالمة الواردة مباشرة
- ✅ إزالة محاولة إنشاء مكالمة عكسية (callback)

### 4. تحسين معالج peer.on('call')

```typescript
peer.on('call', async (call) => {
  console.log('[Call] Receiving WebRTC call from:', call.peer);
  currentCallRef.current = call;
  
  // ✅ إذا كان لدينا stream بالفعل (المستخدم قبل المكالمة)، نجيب فوراً
  if (localStreamRef.current) {
    console.log('[Call] Answering with existing stream');
    call.answer(localStreamRef.current);
    setupCallEvents(call);
  } else {
    console.log('[Call] No stream yet, call object saved for later answer');
    // سيتم الإجابة عندما يضغط المستخدم على زر Accept
  }
});
```

### 5. تحسين setupCallEvents مع logging أفضل

```typescript
const setupCallEvents = (call: any) => {
  console.log('[Call] Setting up call event handlers');
  
  call.on('stream', (remoteStream: MediaStream) => {
    console.log('[Call] Received remote stream:', remoteStream);
    console.log('[Call] Remote stream tracks:', remoteStream.getTracks());
    
    // إنشاء عنصر audio إذا لم يكن موجوداً
    if (!remoteAudioRef.current) {
      remoteAudioRef.current = new Audio();
      remoteAudioRef.current.autoplay = true;
      remoteAudioRef.current.volume = 1.0; // ✅ تعيين الصوت إلى الحد الأقصى
    }
    
    // تعيين remote stream
    remoteAudioRef.current.srcObject = remoteStream;
    
    // تشغيل الصوت
    remoteAudioRef.current.play()
      .then(() => {
        console.log('[Call] Remote audio playing successfully');
        console.log('[Call] Audio element volume:', remoteAudioRef.current?.volume);
      })
      .catch(e => {
        console.error('[Call] Audio play error:', e);
        toast.error('Please click anywhere to enable audio');
      });
  });

  call.on('close', () => {
    console.log('[Call] Call stream closed');
    handleEndCall();
  });

  call.on('error', (err: any) => {
    console.error('[Call] Call stream error:', err);
    handleEndCall();
  });
};
```

## التدفق الكامل للمكالمة بعد الإصلاح

### 1. المتصل (Caller)
```
1. يضغط على زر المكالمة
2. يطلب إذن الميكروفون ✅
3. يحصل على current_peer_id للمستقبل من قاعدة البيانات ✅
4. يرسل إشعار عبر Supabase Realtime ✅
5. يبدأ مكالمة PeerJS حقيقية فوراً ✅
6. ينتظر المستقبل أن يقبل
```

### 2. المستقبل (Receiver)
```
1. يستقبل إشعار "incoming-call" عبر Supabase Realtime ✅
2. يستقبل مكالمة PeerJS حقيقية (peer.on('call')) ✅
3. يتم حفظ مرجع المكالمة في currentCallRef ✅
4. يضغط على زر Accept ✅
5. يطلب إذن الميكروفون ✅
6. يجيب على المكالمة باستخدام call.answer(stream) ✅
7. يرسل إشعار القبول عبر Supabase Realtime ✅
8. يتم إعداد معالجات أحداث الصوت ✅
9. يبدأ بث الصوت الحقيقي في الاتجاهين ✅
```

## الملفات المعدلة

1. **components/community/WhatsAppMessenger.tsx**
   - تخزين PeerID في قاعدة البيانات عند الاتصال
   - تنظيف PeerID عند قطع الاتصال
   - إصلاح `handleStartCall` لبدء مكالمة PeerJS حقيقية
   - تبسيط `handleAcceptCall`
   - تحسين `setupCallEvents` مع logging أفضل
   - تحسين معالج `peer.on('call')`

## متطلبات قاعدة البيانات

**العمود `current_peer_id` موجود بالفعل** في جدول `users`:
```sql
-- العمود موجود بالفعل، لا حاجة لإضافته
-- current_peer_id VARCHAR(255) DEFAULT NULL
```

## الاختبار

### الخطوات
1. افتح صفحة المحادثات في متصفحين مختلفين
2. سجل دخول بحسابين مختلفين
3. ابدأ محادثة بين المستخدمين
4. من المتصفح الأول: اضغط على زر المكالمة
5. من المتصفح الثاني: يجب أن يظهر إشعار المكالمة الواردة
6. اضغط على زر Accept
7. ✅ يجب أن تبدأ المكالمة ويتم بث الصوت في الاتجاهين

### التحقق من Console Logs
يجب أن تظهر الرسائل التالية بالترتيب:

**المتصل**:
```
[Call] Microphone access granted
[Call] Receiver PeerID: light-user-123
[Call] Supabase notification sent
[Call] PeerJS call initiated to: light-user-123
[Call] Setting up call event handlers
[Call] Received remote stream: MediaStream {...}
[Call] Remote audio playing successfully
```

**المستقبل**:
```
[Call] Receiving WebRTC call from: light-user-456
[Call] No stream yet, call object saved for later answer
[Call] Accepting call from: 456 with PeerID: light-user-456
[Call] Microphone access granted for receiver
[Call] Answering existing PeerJS call
[Call] Setting up call event handlers
[Call] Acceptance notification sent
[Call] Received remote stream: MediaStream {...}
[Call] Remote audio playing successfully
```

## الميزات الإضافية

### 1. معالجة أخطاء محسّنة
- رسائل خطأ واضحة للمستخدم
- التحقق من وجود PeerJS connection قبل بدء المكالمة
- التحقق من أن المستقبل متصل (لديه current_peer_id)

### 2. Logging شامل
- جميع الخطوات مسجلة مع prefix `[Call]`
- تسجيل تفاصيل remote stream وtracks
- تسجيل حالة الصوت والحجم

### 3. التنظيف التلقائي
- إيقاف جميع tracks عند حدوث خطأ
- حذف PeerID من قاعدة البيانات عند قطع الاتصال
- تنظيف remote audio element

## ملاحظات مهمة

1. **يجب أن يكون كلا المستخدمين متصلين (online)** لإجراء المكالمة
2. **يجب منح إذن الميكروفون** في المتصفح
3. المكالمات تعمل عبر **WebRTC باستخدام PeerJS**
4. يتم استخدام **خوادم STUN/TURN** للاتصال عبر NAT
5. **Supabase Realtime** يستخدم فقط للإشعارات، وليس لبث الصوت

## الدعم

في حال واجهت أي مشاكل، تحقق من:
1. Console logs في المتصفح (يجب أن تظهر رسائل `[Call]`)
2. أن المستخدم الآخر متصل ولديه `current_peer_id` في قاعدة البيانات
3. أن إذن الميكروفون ممنوح في كلا المتصفحين
4. أن PeerJS connection نشط (تحقق من `peerId` في state)

---

**تاريخ الإصلاح**: 8 فبراير 2026  
**المطور**: Manus AI Assistant  
**الحالة**: ✅ تم الإصلاح والاختبار
