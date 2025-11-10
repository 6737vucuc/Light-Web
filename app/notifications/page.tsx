'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, MessageCircle, UserPlus, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface Notification {
  id: number;
  type: string;
  userId: number;
  userName: string;
  userAvatar?: string;
  content: string;
  postId?: number;
  isRead: boolean;
  createdAt: Date;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications(
          notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'like' || notification.type === 'comment') {
      if (notification.postId) {
        router.push(`/community?post=${notification.postId}`);
      }
    } else if (notification.type === 'new_follower' || notification.type === 'follow_request') {
      router.push(`/user-profile/${notification.userId}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-6 h-6 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageCircle className="w-6 h-6 text-blue-500" />;
      case 'new_follower':
      case 'follow_request':
        return <UserPlus className="w-6 h-6 text-purple-500" />;
      default:
        return <Heart className="w-6 h-6 text-gray-500" />;
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="w-full px-4">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-base font-semibold">Notifications</h1>
            {unreadCount > 0 ? (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-500 font-semibold"
              >
                Mark all read
              </button>
            ) : (
              <div className="w-20"></div>
            )}
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-400'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
            filter === 'unread'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-400'
          }`}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-gray-200">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'unread'
                ? 'No unread notifications'
                : 'No notifications yet'}
            </h3>
            <p className="text-sm text-gray-600">
              {filter === 'unread'
                ? "You're all caught up!"
                : "When someone likes or comments on your posts, you'll see it here"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors relative cursor-pointer ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
            >
              {/* Avatar with Icon */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                  {notification.userAvatar ? (
                    <Image
                      src={getAvatarUrl(notification.userAvatar)}
                      alt={notification.userName}
                      width={48}
                      height={48}
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-lg">
                      {notification.userName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="text-sm">
                  <span className="font-semibold">{notification.userName}</span>{' '}
                  <span className="text-gray-700">{notification.content}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getTimeAgo(notification.createdAt)}
                </div>
              </div>

              {/* Unread Indicator */}
              {!notification.isRead && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
