'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, MessageCircle, UserPlus, X } from 'lucide-react';
import Image from 'next/image';

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'message';
  fromUser: {
    id: number;
    username: string;
    name: string;
    avatar?: string;
  };
  post?: {
    id: number;
    imageUrl?: string;
  };
  comment?: {
    text: string;
  };
  message?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
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

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
      });
      if (response.ok) {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotifications(notifications.filter((n) => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.type === 'follow') {
      router.push(`/user-profile/${notification.fromUser.id}`);
    } else if (notification.type === 'message') {
      router.push(`/messages?userId=${notification.fromUser.id}`);
    } else if (notification.post) {
      router.push(`/post/${notification.post.id}`);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-8 h-8 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageCircle className="w-8 h-8 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-8 h-8 text-purple-500" />;
      case 'message':
        return <MessageCircle className="w-8 h-8 text-green-500" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return `commented: ${notification.comment?.text || ''}`;
      case 'follow':
        return 'started following you';
      case 'message':
        return `sent you a message: ${notification.message || ''}`;
      default:
        return '';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
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
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-500 font-semibold"
              >
                Mark all read
              </button>
            )}
            {unreadCount === 0 && <div className="w-20"></div>}
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
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
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
              className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors relative ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
            >
              {/* Avatar with Icon */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  {notification.fromUser.avatar ? (
                    <Image
                      src={getAvatarUrl(notification.fromUser.avatar)}
                      alt={notification.fromUser.name}
                      width={48}
                      height={48}
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                      {notification.fromUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
              </div>

              {/* Content */}
              <div
                className="flex-1 cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="text-sm">
                  <span className="font-semibold">{notification.fromUser.username}</span>{' '}
                  <span className="text-gray-700">{getNotificationText(notification)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getTimeAgo(notification.createdAt)}
                </div>
              </div>

              {/* Post Thumbnail */}
              {notification.post?.imageUrl && (
                <div
                  className="w-12 h-12 rounded overflow-hidden bg-gray-200 flex-shrink-0 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Image
                    src={notification.post.imageUrl}
                    alt="Post"
                    width={48}
                    height={48}
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>

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
