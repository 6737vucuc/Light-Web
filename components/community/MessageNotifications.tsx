'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Notification {
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function MessageNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previousUnreadRef = useRef(0);
  const router = useRouter();

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setHasPermission(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setHasPermission(permission === 'granted');
        });
      }
    }
  }, []);

  // Fetch unread messages
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await fetch('/api/messages/unread');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          
          // Show browser notification if new messages arrived
          if (data.totalUnread > previousUnreadRef.current && previousUnreadRef.current > 0) {
            const newNotifications = data.notifications.slice(0, data.totalUnread - previousUnreadRef.current);
            newNotifications.forEach((notif: Notification) => {
              showBrowserNotification(notif);
            });
            
            // Play notification sound
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.error('Error playing sound:', e));
            }
          }
          
          previousUnreadRef.current = data.totalUnread;
          setTotalUnread(data.totalUnread);
        }
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 60000); // Check every 1 minute (reduced from 5 seconds)

    return () => clearInterval(interval);
  }, []);

  const showBrowserNotification = (notif: Notification) => {
    if (hasPermission && 'Notification' in window) {
      const notification = new Notification(notif.senderName, {
        body: notif.lastMessage.length > 50 
          ? notif.lastMessage.substring(0, 50) + '...' 
          : notif.lastMessage,
        icon: notif.senderAvatar 
          ? `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${notif.senderAvatar}`
          : '/default-avatar.png',
        tag: `message-${notif.senderId}`,
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        router.push(`/messages?userId=${notif.senderId}`);
        notification.close();
      };
    }
  };

  const getAvatarUrl = (avatar: string | null) => {
    if (!avatar) return '/default-avatar.png';
    // Support base64 images
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (senderId: number) => {
    setShowDropdown(false);
    router.push(`/messages?userId=${senderId}`);
  };

  return (
    <>
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
      
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MessageCircle className="w-6 h-6 text-gray-700" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Messages</h3>
                <button
                  onClick={() => setShowDropdown(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No new messages</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif.senderId}
                      onClick={() => handleNotificationClick(notif.senderId)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-start gap-3"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-purple-100">
                          <Image
                            src={getAvatarUrl(notif.senderAvatar)}
                            alt={notif.senderName}
                            width={56}
                            height={56}
                            className="object-cover"
                          />
                        </div>
                        {notif.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {notif.unreadCount}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {notif.senderName}
                          </p>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {formatTime(notif.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {notif.lastMessage.length > 60
                            ? notif.lastMessage.substring(0, 60) + '...'
                            : notif.lastMessage}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push('/messages');
                  }}
                  className="w-full text-center text-purple-600 hover:text-purple-700 font-medium text-sm py-2"
                >
                  See all in Messages
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
