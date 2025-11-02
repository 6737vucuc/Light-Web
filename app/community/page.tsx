'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Search, PlusSquare, Heart, User } from 'lucide-react';
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>({ users: [], posts: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('home');

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
    <div className="min-h-screen bg-white pb-16">
      {/* Instagram-style Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div 
              onClick={() => router.push('/community')}
              className="cursor-pointer"
            >
              <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Light of Life
              </h1>
            </div>

            {/* Right Icons - Heart and Messages only */}
            <div className="flex items-center gap-5">
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

              {/* Messages Icon with Badge */}
              <button
                onClick={() => router.push('/messages')}
                className="relative hover:scale-110 transition-transform"
                title="Messages"
              >
                <svg className="w-7 h-7 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {showSearch && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-16"
          onClick={() => {
            setShowSearch(false);
            setSearchQuery('');
          }}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-2xl mx-4 shadow-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setSearchQuery(value);
                    
                    if (value.trim().length > 0) {
                      setIsSearching(true);
                      try {
                        const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
                        if (response.ok) {
                          const data = await response.json();
                          setSearchResults(data);
                        }
                      } catch (error) {
                        console.error('Search error:', error);
                      } finally {
                        setIsSearching(false);
                      }
                    } else {
                      setSearchResults({ users: [], posts: [] });
                    }
                  }}
                  placeholder="Search..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Search Results */}
            <div className="overflow-y-auto max-h-96">
              {isSearching ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
                </div>
              ) : searchQuery.trim() ? (
                <div>
                  {/* Users Results */}
                  {searchResults.users && searchResults.users.length > 0 && (
                    <div className="p-4">
                      {searchResults.users.map((user: any) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            router.push(`/user-profile/${user.id}`);
                            setShowSearch(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                            {user.avatar ? (
                              <Image
                                src={getAvatarUrl(user.avatar)}
                                alt={user.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                                {user.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-sm">{user.username}</p>
                            <p className="text-gray-500 text-sm">{user.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {searchResults.users?.length === 0 && searchResults.posts?.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <p>No results found</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Search for people and posts</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto">
        {/* Stories Bar */}
        <div className="border-b border-gray-200 bg-white">
          <StoriesBar currentUserId={currentUser?.id} />
        </div>

        {/* Feed */}
        <div className="py-4">
          <PublicFeed currentUser={currentUser} />
        </div>
      </main>

      {/* Instagram-style Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-around h-14">
            {/* Home */}
            <button
              onClick={() => {
                setActiveTab('home');
                router.push('/community');
              }}
              className="flex flex-col items-center justify-center flex-1 hover:scale-110 transition-transform"
            >
              <Home className={`w-7 h-7 ${activeTab === 'home' ? 'text-gray-900' : 'text-gray-400'}`} />
            </button>

            {/* Search */}
            <button
              onClick={() => {
                setActiveTab('search');
                setShowSearch(true);
              }}
              className="flex flex-col items-center justify-center flex-1 hover:scale-110 transition-transform"
            >
              <Search className={`w-7 h-7 ${activeTab === 'search' ? 'text-gray-900' : 'text-gray-400'}`} />
            </button>

            {/* Create Post */}
            <button
              onClick={() => {
                setActiveTab('create');
                router.push('/create-post');
              }}
              className="flex flex-col items-center justify-center flex-1 hover:scale-110 transition-transform"
            >
              <PlusSquare className={`w-7 h-7 ${activeTab === 'create' ? 'text-gray-900' : 'text-gray-400'}`} />
            </button>

            {/* Profile */}
            <button
              onClick={() => {
                setActiveTab('profile');
                router.push('/profile');
              }}
              className="flex flex-col items-center justify-center flex-1 hover:scale-110 transition-transform"
            >
              {currentUser?.avatar ? (
                <div className={`relative w-7 h-7 rounded-full overflow-hidden ${activeTab === 'profile' ? 'ring-2 ring-gray-900' : 'ring-1 ring-gray-300'}`}>
                  <Image
                    src={getAvatarUrl(currentUser.avatar)}
                    alt={currentUser.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <User className={`w-7 h-7 ${activeTab === 'profile' ? 'text-gray-900' : 'text-gray-400'}`} />
              )}
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
