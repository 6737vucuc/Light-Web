// Browser Notifications for Messages and Calls

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  onClick?: () => void;
}

export class BrowserNotifications {
  private static instance: BrowserNotifications;
  private permission: NotificationPermission = 'default';

  private constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  static getInstance(): BrowserNotifications {
    if (!BrowserNotifications.instance) {
      BrowserNotifications.instance = new BrowserNotifications();
    }
    return BrowserNotifications.instance;
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Browser notifications are not supported');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show a browser notification
   */
  async show(options: NotificationOptions): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Browser notifications are not supported');
      return;
    }

    // Request permission if not granted
    if (this.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/logo.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: false,
        silent: false,
      });

      // Handle click event
      if (options.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Show notification for new message
   */
  async showMessageNotification(
    senderName: string,
    messageContent: string,
    conversationId?: number
  ): Promise<void> {
    await this.show({
      title: `New message from ${senderName}`,
      body: messageContent.length > 100 
        ? messageContent.substring(0, 100) + '...' 
        : messageContent,
      tag: `message-${conversationId}`,
      data: { type: 'message', conversationId },
      onClick: () => {
        if (conversationId) {
          window.location.href = `/messages?conversation=${conversationId}`;
        } else {
          window.location.href = '/messages';
        }
      },
    });
  }

  /**
   * Show notification for incoming call
   */
  async showCallNotification(
    callerName: string,
    callType: 'voice' | 'video',
    callId: number
  ): Promise<void> {
    await this.show({
      title: `Incoming ${callType} call`,
      body: `${callerName} is calling you...`,
      tag: `call-${callId}`,
      data: { type: 'call', callId, callType },
      onClick: () => {
        window.location.href = `/call/${callId}`;
      },
    });
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }
}

// Export singleton instance
export const browserNotifications = BrowserNotifications.getInstance();
