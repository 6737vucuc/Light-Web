'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, MessageCircle, UserPlus } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Mock data - will be replaced with real API data later
  const mockNotifications = [
    {
      id: 1,
      type: 'like',
      username: 'john_doe',
      text: 'liked your post',
      time: '5m',
      isRead: false,
      avatar: null,
    },
    {
      id: 2,
      type: 'comment',
      username: 'jane_smith',
      text: 'commented: Great post!',
      time: '1h',
      isRead: false,
      avatar: null,
    },
    {
      id: 3,
      type: 'follow',
      username: 'mike_wilson',
      text: 'started following you',
      time: '3h',
      isRead: true,
      avatar: null,
    },
  ];

  const [notifications, setNotifications] = useState(mockNotifications);

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-6 h-6 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageCircle className="w-6 h-6 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-6 h-6 text-purple-500" />;
      default:
        return null;
    }
  };

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
              className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors relative ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
            >
              {/* Avatar with Icon */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                  {notification.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="text-sm">
                  <span className="font-semibold">{notification.username}</span>{' '}
                  <span className="text-gray-700">{notification.text}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {notification.time}
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
