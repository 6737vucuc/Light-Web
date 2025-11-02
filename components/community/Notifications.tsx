'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Heart, MessageCircle, UserPlus, Users, Share2, X, Phone, Video } from 'lucide-react';
import Image from 'next/image';

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'friend_request' | 'friend_accept' | 'share' | 'mention' | 'message' | 'call';
  userId: number;
  userName: string;
  userAvatar: string | null;
  content: string;
  postId: number | null;
  commentId: number | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsProps {
  currentUser: any;
  onClose?: () => void;
}

export default function Notifications({ currentUser, onClose }: NotificationsProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Close notifications panel
    if (onClose) {
      onClose();
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'share':
        // Navigate to post
        if (notification.postId) {
          router.push(`/post/${notification.postId}`);
        }
        break;
      
      case 'friend_request':
      case 'friend_accept':
        // Navigate to user profile
        router.push(`/user-profile/${notification.userId}`);
        break;
      
      case 'message':
        // Navigate to messages with that user
        router.push(`/messages?userId=${notification.userId}`);
        break;
      
      case 'mention':
        // Navigate to post or comment
        if (notification.postId) {
          router.push(`/post/${notification.postId}`);
        }
        break;
      
      case 'call':
        // Navigate to call page
        if (notification.relatedId) {
          router.push(`/call/${notification.relatedId}`);
        }
        break;
      
      default:
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" fill="currentColor" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'friend_request':
      case 'friend_accept':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'share':
        return <Share2 className="w-5 h-5 text-purple-500" />;
      case 'mention':
        return <Users className="w-5 h-5 text-orange-500" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'call':
        return <Phone className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diff = now.getTime() - notifDate.getTime();
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  };

  return (
    <div className="w-96 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Bell className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No notifications yet</p>
            <p className="text-sm">When you get notifications, they'll show up here</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar with Icon */}
                <div className="relative flex-shrink-0">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    {notification.userAvatar ? (
                      <Image
                        src={getAvatarUrl(notification.userAvatar)}
                        alt={notification.userName}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-400 text-white font-bold">
                        {notification.userName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Icon Badge */}
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{notification.userName}</span>
                    {' '}
                    <span className="text-gray-600">{notification.content}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{getTimeAgo(notification.createdAt)}</p>
                </div>

                {/* Unread Indicator */}
                {!notification.isRead && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
