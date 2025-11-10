'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Search, PlusSquare, Heart, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Feed from '@/components/community/Feed';
import Stories from '@/components/community/Stories';
import Notifications from '@/components/community/Notifications';
import Messenger from '@/components/community/Messenger';
import DailyVerse from '@/components/verses/DailyVerse';

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
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      {/* Daily Verse Modal */}
      <DailyVerse />
      {/* Top Header - Instagram Style */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="w-full px-4">
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

            {/* Right Icons */}
            <div className="flex items-center gap-5">
              {/* Desktop Notifications */}
              <div className="hidden md:block">
                <button
                  onClick={() => router.push('/notifications')}
                  className="hover:scale-110 transition-transform"
                  title="Notifications"
                >
                  <Heart className="w-7 h-7 text-gray-800" />
                </button>
              </div>

              {/* Messenger */}
              <button
                onClick={() => router.push('/messages')}
                className="relative hover:scale-110 transition-transform"
                title="Messages"
              >
                <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-gray-800" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center text-[10px]">
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
            className="bg-white rounded-xl w-full max-w-xl mx-4 shadow-2xl max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    <div className="p-2">
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
                          <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
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

      {/* Stories */}
      <Stories currentUser={currentUser} />

      {/* Main Content */}
      <main className="bg-gray-50">
        <Feed currentUser={currentUser} />
      </main>

      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-14">
          <button
            onClick={() => router.push('/community')}
            className="flex-1 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors h-full"
          >
            <Home className="w-7 h-7 text-gray-800" strokeWidth={2} />
          </button>

          <button
            onClick={() => setShowSearch(true)}
            className="flex-1 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors h-full"
          >
            <Search className="w-7 h-7 text-gray-800" strokeWidth={2} />
          </button>

          <button
            className="flex-1 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors h-full"
          >
            <PlusSquare className="w-7 h-7 text-gray-800" strokeWidth={2} />
          </button>

          <button
            onClick={() => router.push('/notifications')}
            className="flex-1 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors h-full"
          >
            <Heart className="w-7 h-7 text-gray-800" strokeWidth={2} />
          </button>

          <button
            onClick={() => router.push(`/user-profile/${currentUser?.id}`)}
            className="flex-1 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors h-full"
          >
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-800">
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
            </div>
          </button>
        </div>
      </nav>

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
