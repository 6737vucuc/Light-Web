'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Search, PlusSquare, Heart, Menu } from 'lucide-react';
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
    
    // Update lastSeen every 2 minutes to maintain online status
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

  if (isLoading) {
    return <SecurityLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Instagram-style Header */}
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

            {/* Right Icons */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push('/community')}
                className="hover:scale-110 transition-transform"
                title="Home"
              >
                <Home className="w-6 h-6 text-gray-800" />
              </button>
              
              <button
                onClick={() => router.push('/messages')}
                className="hover:scale-110 transition-transform"
                title="Messages"
              >
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              <button
                onClick={() => {/* TODO: Add create post modal */}}
                className="hover:scale-110 transition-transform"
                title="Create"
              >
                <PlusSquare className="w-6 h-6 text-gray-800" />
              </button>

              <button
                onClick={() => setShowSearch(!showSearch)}
                className="hover:scale-110 transition-transform"
                title="Search"
              >
                <Search className="w-6 h-6 text-gray-800" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="hover:scale-110 transition-transform"
                  title="Notifications"
                >
                  <Heart className="w-6 h-6 text-gray-800" />
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2">
                    <Notifications currentUser={currentUser} />
                  </div>
                )}
              </div>

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

      {/* Search Modal */}
      {showSearch && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 backdrop-blur-sm"
          onClick={() => {
            setShowSearch(false);
            setSearchQuery('');
          }}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-2xl mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
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
                  placeholder="Search posts, users, topics..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      // TODO: Implement search functionality
                      console.log('Searching for:', searchQuery);
                      setShowSearch(false);
                      setSearchQuery('');
                    }
                  }}
                />
              </div>
              
              {/* Search Results */}
              <div className="mt-4 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Searching...</p>
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="space-y-4">
                    {/* Users Results */}
                    {searchResults.users && searchResults.users.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Users</h3>
                        <div className="space-y-2">
                          {searchResults.users.map((user: any) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                router.push(`/user-profile/${user.id}`);
                                setShowSearch(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
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
                                <p className="font-semibold text-sm text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">@{user.username}</p>
                                {user.bio && (
                                  <p className="text-xs text-gray-400 truncate">{user.bio}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Posts Results */}
                    {searchResults.posts && searchResults.posts.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-4">Posts</h3>
                        <div className="space-y-2">
                          {searchResults.posts.map((post: any) => (
                            <div
                              key={post.id}
                              className="p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                              onClick={() => {
                                // TODO: Navigate to post detail
                                setShowSearch(false);
                                setSearchQuery('');
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                                  {post.userAvatar ? (
                                    <Image
                                      src={getAvatarUrl(post.userAvatar)}
                                      alt={post.userName}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                                      {post.userName?.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-sm text-gray-900">{post.userName}</p>
                                  <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                    <span>❤️ {post.likesCount || 0}</span>
                                    <span>💬 {post.commentsCount || 0}</span>
                                  </div>
                                </div>
                                {post.imageUrl && (
                                  <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                    <Image
                                      src={post.imageUrl}
                                      alt="Post"
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Results */}
                    {searchResults.users?.length === 0 && searchResults.posts?.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No results found for "{searchQuery}"</p>
                        <p className="text-sm mt-2 text-gray-400">Try searching for something else</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500">Recent</h3>
                    <p className="text-center py-8 text-gray-400 text-sm">No recent searches</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto">
        <div className="flex gap-8 pt-8">
          {/* Feed Section */}
          <div className="flex-1 max-w-[630px] mx-auto">
            {/* Stories Bar */}
            <div className="mb-6">
              <StoriesBar currentUserId={currentUser?.id} />
            </div>

            {/* Posts Feed */}
            <PublicFeed currentUser={currentUser} />
          </div>

          {/* Sidebar - Hidden on mobile */}
          <div className="hidden xl:block w-80 pt-8">
            <div className="fixed w-80">
              {/* User Profile Card */}
              {currentUser && (
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => router.push('/profile')}
                      className="relative w-14 h-14 rounded-full overflow-hidden"
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
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-xl">
                          {currentUser.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>
                    <div className="flex-1">
                      <button
                        onClick={() => router.push('/profile')}
                        className="font-semibold text-gray-900 hover:text-gray-600 text-sm"
                      >
                        {currentUser.username || currentUser.name}
                      </button>
                      <p className="text-gray-500 text-xs">{currentUser.name}</p>
                    </div>
                    <button
                      onClick={() => {
                        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                        router.push('/auth/login');
                      }}
                      className="text-blue-500 text-xs font-semibold hover:text-blue-700"
                    >
                      Switch
                    </button>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-500 font-semibold text-sm">
                    Suggestions For You
                  </h3>
                  <button className="text-gray-900 text-xs font-semibold hover:text-gray-600">
                    See All
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Suggestion items will be loaded dynamically */}
                  <p className="text-gray-400 text-sm">No suggestions available</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 text-xs text-gray-400 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <a href="#" className="hover:underline">About</a>
                  <span>·</span>
                  <a href="#" className="hover:underline">Help</a>
                  <span>·</span>
                  <a href="#" className="hover:underline">Press</a>
                  <span>·</span>
                  <a href="#" className="hover:underline">API</a>
                  <span>·</span>
                  <a href="#" className="hover:underline">Jobs</a>
                  <span>·</span>
                  <a href="#" className="hover:underline">Privacy</a>
                  <span>·</span>
                  <a href="#" className="hover:underline">Terms</a>
                </div>
                <p className="text-gray-400">© 2025 LIGHT OF LIFE</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around h-14">
          <button
            onClick={() => router.push('/community')}
            className="p-2"
          >
            <Home className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={() => router.push('/lessons')}
            className="p-2"
          >
            <Search className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={() => {/* TODO: Add create post */}}
            className="p-2"
          >
            <PlusSquare className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2"
          >
            <Heart className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="p-2"
          >
            {currentUser?.avatar ? (
              <div className="relative w-6 h-6 rounded-full overflow-hidden border border-gray-300">
                <Image
                  src={getAvatarUrl(currentUser.avatar)}
                  alt={currentUser.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                {currentUser?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
