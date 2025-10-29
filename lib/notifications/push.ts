// Push Notifications System using Web Push API
import { db } from '@/lib/db';

interface PushSubscription {
  userId: number;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface Notification {
  userId: number;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

const subscriptions: Map<number, PushSubscription[]> = new Map();

export class PushNotificationService {
  // Subscribe user to push notifications
  static async subscribe(userId: number, subscription: PushSubscription): Promise<boolean> {
    try {
      const userSubs = subscriptions.get(userId) || [];
      
      // Check if subscription already exists
      const exists = userSubs.some(sub => sub.endpoint === subscription.endpoint);
      if (!exists) {
        userSubs.push(subscription);
        subscriptions.set(userId, userSubs);
      }
      
      return true;
    } catch (error) {
      console.error('Subscribe error:', error);
      return false;
    }
  }

  // Unsubscribe user from push notifications
  static async unsubscribe(userId: number, endpoint: string): Promise<boolean> {
    try {
      const userSubs = subscriptions.get(userId) || [];
      const filtered = userSubs.filter(sub => sub.endpoint !== endpoint);
      subscriptions.set(userId, filtered);
      return true;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return false;
    }
  }

  // Send push notification to user
  static async sendNotification(notification: Notification): Promise<boolean> {
    try {
      const userSubs = subscriptions.get(notification.userId) || [];
      
      if (userSubs.length === 0) {
        console.log('No subscriptions for user:', notification.userId);
        return false;
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/logo.png',
        badge: notification.badge || '/logo.png',
        data: notification.data || {},
        actions: notification.actions || [],
      });

      // In production, use web-push library to send actual push notifications
      console.log('Sending push notification:', payload);
      
      return true;
    } catch (error) {
      console.error('Send notification error:', error);
      return false;
    }
  }

  // Send notification to multiple users
  static async sendBulkNotification(
    userIds: number[],
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    const promises = userIds.map(userId =>
      this.sendNotification({ userId, title, body, data })
    );
    await Promise.all(promises);
  }

  // Notification types
  static async notifyNewMessage(
    userId: number,
    senderName: string,
    message: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      title: `New message from ${senderName}`,
      body: message.substring(0, 100),
      icon: '/icons/message.png',
      data: { type: 'message', sender: senderName },
      actions: [
        { action: 'reply', title: 'Reply' },
        { action: 'view', title: 'View' },
      ],
    });
  }

  static async notifyNewComment(
    userId: number,
    commenterName: string,
    postId: number
  ): Promise<void> {
    await this.sendNotification({
      userId,
      title: `${commenterName} commented on your post`,
      body: 'Click to view the comment',
      icon: '/icons/comment.png',
      data: { type: 'comment', postId },
    });
  }

  static async notifyNewLike(
    userId: number,
    likerName: string,
    postId: number
  ): Promise<void> {
    await this.sendNotification({
      userId,
      title: `${likerName} liked your post`,
      body: 'Click to view your post',
      icon: '/icons/like.png',
      data: { type: 'like', postId },
    });
  }

  static async notifyFriendRequest(
    userId: number,
    requesterName: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      title: 'New friend request',
      body: `${requesterName} sent you a friend request`,
      icon: '/icons/friend.png',
      data: { type: 'friend_request' },
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'decline', title: 'Decline' },
      ],
    });
  }

  static async notifyMention(
    userId: number,
    mentionerName: string,
    postId: number
  ): Promise<void> {
    await this.sendNotification({
      userId,
      title: `${mentionerName} mentioned you`,
      body: 'Click to view the post',
      icon: '/icons/mention.png',
      data: { type: 'mention', postId },
    });
  }
}

// Client-side notification permission request
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Register service worker for push notifications
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Subscribe to push notifications
export const subscribeToPush = async (
  userId: number
): Promise<PushSubscription | null> => {
  try {
    const registration = await registerServiceWorker();
    if (!registration) return null;

    const permission = await requestNotificationPermission();
    if (!permission) return null;

    // In production, use actual VAPID keys
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    });

    // Send subscription to server
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
      }),
    });

    return subscription as any;
  } catch (error) {
    console.error('Push subscription error:', error);
    return null;
  }
};
