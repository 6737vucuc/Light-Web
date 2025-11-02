'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Users, Search, Bell } from 'lucide-react';
import Image from 'next/image';
import GroupChat from '@/components/community/GroupChat';
import PublicFeed from '@/components/community/PublicFeed';
import SecurityLoading from '@/components/SecurityLoading';
import MessageNotifications from '@/components/community/MessageNotifications';
import Notifications from '@/components/community/Notifications';
import Stories from '@/components/community/Stories';

export default function CommunityPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'chat' | 'public'>('public');
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
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          // Update lastSeen to show online status
          fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
          setIsLoading(false);
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
    
    // Update lastSeen every 2 minutes to maintain online status (reduced from 30s)
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [router, isAuthenticated]);

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  if (isLoading) {
    return <SecurityLoading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              onClick={() => router.push('/community')}
              className="flex items-center cursor-pointer group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                Light Community
              </h1>
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2.5 rounded-full hover:bg-gray-100 transition-all duration-200 relative group"
                title="Search"
              >
                <Search className="w-6 h-6 text-gray-600 group-hover:text-purple-600 transition-colors" />
              </button>
              
              <MessageNotifications />
              
              <Notifications currentUser={currentUser} />
              
              {currentUser && (
                <button
                  onClick={() => router.push(`/user-profile/${currentUser.id}`)}
                  className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100 hover:ring-2 hover:ring-purple-500 transition-all duration-200 hover:scale-105"
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
                    <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-lg">
                      {currentUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="pb-4 animate-fadeIn">
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts, users, topics..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 transition-all"
                    autoFocus
                  />
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Group Chat
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex items-center px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'public'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users className="h-5 w-5 mr-2" />
              Public
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto">
          {activeTab === 'chat' ? (
            <div className="max-w-4xl mx-auto">
              <GroupChat currentUser={currentUser} />
            </div>
          ) : (
            <>
              <Stories currentUser={currentUser} />
              <PublicFeed currentUser={currentUser} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
