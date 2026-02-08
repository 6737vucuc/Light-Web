/**
 * Notification Service
 * Handles push notifications and browser notifications for calls and messages
 */

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: Record<string, any>;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export class NotificationService {
  /**
   * Request notification permission from user
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Show a browser notification
   */
  static showNotification(payload: NotificationPayload): Notification | null {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/notification-icon.png',
        badge: payload.badge || '/notification-badge.png',
        tag: payload.tag || 'default',
        requireInteraction: payload.requireInteraction || false,
        actions: payload.actions || [],
        data: payload.data || {},
      });

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show incoming call notification
   */
  static showIncomingCallNotification(
    callerName: string,
    callerAvatar?: string,
    callType: 'voice' | 'video' = 'voice'
  ): Notification | null {
    const permission = this.requestPermission();
    
    if (permission !== 'granted') {
      return null;
    }

    return this.showNotification({
      title: `Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`,
      body: `${callerName} is calling...`,
      icon: callerAvatar || '/default-avatar.png',
      badge: '/call-badge.png',
      tag: 'incoming-call',
      requireInteraction: true,
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'reject', title: 'Reject' },
      ],
      data: {
        type: 'incoming-call',
        callType,
        callerName,
      },
    });
  }

  /**
   * Show new message notification
   */
  static showMessageNotification(
    senderName: string,
    messagePreview: string,
    senderAvatar?: string
  ): Notification | null {
    const permission = this.requestPermission();
    
    if (permission !== 'granted') {
      return null;
    }

    return this.showNotification({
      title: `New message from ${senderName}`,
      body: messagePreview.substring(0, 100),
      icon: senderAvatar || '/default-avatar.png',
      badge: '/message-badge.png',
      tag: `message-${senderName}`,
      requireInteraction: false,
      data: {
        type: 'new-message',
        senderName,
      },
    });
  }

  /**
   * Show missed call notification
   */
  static showMissedCallNotification(
    callerName: string,
    callerAvatar?: string
  ): Notification | null {
    return this.showNotification({
      title: 'Missed Call',
      body: `You missed a call from ${callerName}`,
      icon: callerAvatar || '/default-avatar.png',
      badge: '/missed-call-badge.png',
      tag: 'missed-call',
      requireInteraction: false,
      data: {
        type: 'missed-call',
        callerName,
      },
    });
  }

  /**
   * Request service worker registration for push notifications
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers are not supported in this browser');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  static async subscribeToPushNotifications(
    vapidPublicKey: string
  ): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log('Push notification subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Push notification subscription failed:', error);
      return null;
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Close all notifications with a specific tag
   */
  static closeNotificationsByTag(tag: string): void {
    if ('serviceWorker' in navigator && 'getNotifications' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.getNotifications({ tag }).then((notifications) => {
            notifications.forEach((notification) => {
              notification.close();
            });
          });
        });
      });
    }
  }

  /**
   * Close all notifications
   */
  static closeAllNotifications(): void {
    if ('serviceWorker' in navigator && 'getNotifications' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.getNotifications().then((notifications) => {
            notifications.forEach((notification) => {
              notification.close();
            });
          });
        });
      });
    }
  }
}
