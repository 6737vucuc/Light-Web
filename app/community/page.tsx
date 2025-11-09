'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Search, PlusSquare, Heart, User, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Feed from '@/components/community/Feed';
import Stories from '@/components/community/Stories';
import Notifications from '@/components/community/Notifications';
import Messenger from '@/components/community/Messenger';

export default function CommunityPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessenger, setShowMessenger] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>({ users: [], posts: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!mounted) return;
        
        if (response.ok) {
          const data = await response.json();
          if (mounted) {
            setCurrentUser(data.user);
            setIsAuthenticated(true);
            setIsLoading(false);
            
            fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
            fetchUnreadCount();
          }
        } else {
          if (mounted) {
            router.push('/auth/login?redirect=/community');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          router.push('/auth/login?redirect=/community');
        }
      }
    };

    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    let mounted = true;
    
    const interval = setInterval(() => {
      if (mounted) {
        fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
        fetchUnreadCount();
      }
    }, 120000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

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

  const handleSearch = async (value: string) => {
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
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
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

            {/* Search Bar */}
            <div className="hidden md:block flex-1 max-w-xs mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-5">
              <button
                onClick={() => router.push('/community')}
                className="hover:scale-110 transition-transform"
              >
                <Home className={`w-6 h-6 ${activeTab === 'home' ? 'text-gray-900' : 'text-gray-400'}`} />
              </button>

              <button
                onClick={() => setShowSearch(!showSearch)}
                className="md:hidden hover:scale-110 transition-transform"
              >
                <Search className="w-6 h-6 text-gray-800" />
              </button>

              <button className="hover:scale-110 transition-transform">
                <PlusSquare className="w-6 h-6 text-gray-800" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="hover:scale-110 transition-transform"
                >
                  <Heart className={`w-6 h-6 ${showNotifications ? 'text-red-500 fill-red-500' : 'text-gray-800'}`} />
                </button>
                
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-2 z-50">
                      <Notifications 
                        currentUser={currentUser} 
                        onClose={() => setShowNotifications(false)}
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => router.push('/messages')}
                className="relative hover:scale-110 transition-transform"
              >
                <MessageCircle className="w-6 h-6 text-gray-800" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => router.push(`/user-profile/${currentUser?.id}`)}
                className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-200 hover:scale-110 transition-transform"
              >
                {currentUser?.avatar ? (
                  <Image
                    src={getAvatarUrl(currentUser.avatar)}
                    alt={currentUser.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
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
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-900" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-96">
              {isSearching ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
                </div>
              ) : searchQuery.trim() ? (
                <div>
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
                            <p className="text-gray-900 text-sm">{user.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {searchResults.users?.length === 0 && searchResults.posts?.length === 0 && (
                    <div className="text-center py-12 text-gray-900">
                      <p>No results found</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-900">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Search for people and posts</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stories */}
      <Stories currentUser={currentUser} />

      {/* Main Content */}
      <main className="py-6">
        <Feed currentUser={currentUser} />
      </main>

      {/* Messenger Modal */}
      {showMessenger && selectedRecipient && (
        <Messenger
          currentUser={currentUser}
          recipient={selectedRecipient}
          onClose={() => {
            setShowMessenger(false);
            setSelectedRecipient(null);
          }}
        />
      )}
    </div>
  );
}
