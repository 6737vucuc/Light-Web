'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, UserPlus, X } from 'lucide-react';
import Image from 'next/image';

interface NotificationsProps {
  currentUser: any;
  onClose: () => void;
}

export default function Notifications({ currentUser, onClose }: NotificationsProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      default:
        return <Heart className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notifDate.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-xl w-96 max-h-[500px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto max-h-[440px]">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
              className={`flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
            >
              {/* User Avatar */}
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {notification.fromUser?.avatar ? (
                  <Image
                    src={getAvatarUrl(notification.fromUser.avatar)}
                    alt={notification.fromUser.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                    {notification.fromUser?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Notification Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">
                    {notification.fromUser?.name}
                  </span>{' '}
                  {notification.content}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatTimeAgo(notification.createdAt)}
                </p>
              </div>

              {/* Notification Icon */}
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
