'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Heart, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import PublicFeed from '@/components/community/PublicFeed';
import SecurityLoading from '@/components/SecurityLoading';
import Notifications from '@/components/community/Notifications';
import StoriesBar from '@/components/stories/StoriesBar';

export default function CommunityPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          // Update lastSeen to show online status
          fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
          setIsLoading(false);
          
          // Get unread messages count
          fetchUnreadCount();
        } else {
          // Not authenticated, redirect to login
          router.push('/auth/login?redirect=/community');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/auth/login?redirect=/community');
      }
    };

    checkAuth();
    
    // Update lastSeen every 2 minutes to maintain online status
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
        fetchUnreadCount();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [router, isAuthenticated]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/messages/unread');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (isLoading) {
    return <SecurityLoading />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Instagram-style Header - Simple and Clean */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              onClick={() => router.push('/community')}
              className="cursor-pointer"
            >
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Light of Life
              </h1>
            </div>

            {/* Right Icons - Only Heart and Messages like Instagram */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push('/community')}
                className="hover:scale-110 transition-transform"
                title="Home"
              >
                <Home className="w-7 h-7 text-gray-800" />
              </button>
              
              {/* Messages Icon with Badge */}
              <button
                onClick={() => router.push('/messages')}
                className="relative hover:scale-110 transition-transform"
                title="Messages"
              >
                <MessageCircle className="w-7 h-7 text-gray-800" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Icon */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="hover:scale-110 transition-transform"
                  title="Notifications"
                >
                  <Heart className={`w-7 h-7 ${showNotifications ? 'text-red-500 fill-red-500' : 'text-gray-800'}`} />
                </button>
                
                {showNotifications && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    {/* Notifications Panel */}
                    <div className="absolute right-0 mt-2 z-50">
                      <Notifications 
                        currentUser={currentUser} 
                        onClose={() => setShowNotifications(false)}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Profile Picture */}
              {currentUser && (
                <button
                  onClick={() => router.push('/profile')}
                  className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-300 hover:border-gray-400 transition-all"
                  title={currentUser.name}
                >
                  {currentUser.avatar ? (
                    <Image
                      src={getAvatarUrl(currentUser.avatar)}
                      alt={currentUser.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-sm">
                      {currentUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto">
        {/* Stories Bar */}
        <div className="border-b border-gray-200 bg-white">
          <StoriesBar currentUserId={currentUser?.id} />
        </div>

        {/* Feed */}
        <div className="py-6">
          <PublicFeed currentUser={currentUser} />
        </div>
      </main>
    </div>
  );
}
