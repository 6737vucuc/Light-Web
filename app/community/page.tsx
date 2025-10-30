'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Users, Search, Plus } from 'lucide-react';
import Image from 'next/image';
import GroupChat from '@/components/community/GroupChat';
import PublicFeed from '@/components/community/PublicFeed';
import SecurityLoading from '@/components/SecurityLoading';
import MessageNotifications from '@/components/community/MessageNotifications';

export default function CommunityPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'chat' | 'feed'>('feed');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          console.log('Current user data:', data.user);
          console.log('User avatar:', data.user.avatar);
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          // Update lastSeen to show online status
          fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
          // Simulate security initialization
          setTimeout(() => {
            setIsLoading(false);
          }, 3000);
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
    
    // Update lastSeen every 30 seconds to maintain online status
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [router, isAuthenticated]);

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    // Support base64 images
    if (avatar.startsWith('data:')) return avatar;
    // Support base64 images
    if (avatar.startsWith('data:')) return avatar;
    // Support full URLs
    if (avatar.startsWith('http')) return avatar;
    // Support S3 paths
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // يمكن إضافة وظيفة البحث هنا
      console.log('Searching for:', searchQuery);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  if (isLoading) {
    return <SecurityLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo and Icons */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <h1 
              onClick={() => router.push('/community')}
              className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent cursor-pointer"
            >
              Light of Life
            </h1>

            {/* Icons */}
            <div className="flex items-center gap-4">
              {/* User Avatar */}
              {currentUser && (
                <button
                  onClick={() => router.push('/profile')}
                  className="relative w-10 h-10 rounded-full overflow-hidden bg-purple-100 hover:ring-2 hover:ring-purple-500 transition-all"
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
                    <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold">
                      {currentUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              )}
              
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Search className="w-6 h-6 text-gray-700" />
              </button>
              <MessageNotifications />
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="pb-4">
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts, users..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center px-6 py-2 rounded-md transition-colors ${
                activeTab === 'feed'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-5 w-5 mr-2" />
              Public Feed
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center px-6 py-2 rounded-md transition-colors ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Group Chat
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto">
          {activeTab === 'feed' ? (
            <PublicFeed currentUser={currentUser} />
          ) : (
            <div className="max-w-4xl mx-auto"><GroupChat /></div>
          )}
        </div>
      </div>
    </div>
  );
}
