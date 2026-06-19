'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Users, Home, Sparkles, Shield, ArrowLeft, Loader2, MessageCircle, TrendingUp, Globe, Search, Zap, MessageSquare, Heart, Flame, Star, Lightbulb } from 'lucide-react';
import Image from 'next/image';
import PostComposer from '@/components/community/PostComposer';
import PostCard from '@/components/community/PostCard';
import GlobalNotificationListener from '@/components/community/GlobalNotificationListener';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

export default function CommunityPage() {
  const toast = useToast();
  const t = useTranslations('community');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'ar';

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadPosts();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user || data);
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        router.push('/auth/login?redirect=/community');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/auth/login?redirect=/community');
    }
  };

  const loadPosts = async (pageNum: number = 1) => {
    try {
      const response = await fetch(`/api/posts?page=${pageNum}&limit=10&t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (pageNum === 1) {
          setPosts(data.posts || []);
        } else {
          setPosts((prev) => [...prev, ...(data.posts || [])]);
        }
        setHasMore((data.posts || []).length === 10);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const loadMorePosts = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      await loadPosts(nextPage);
      setPage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const { observerTarget } = useInfiniteScroll({
    onLoadMore: loadMorePosts,
    isLoading: isLoadingMore,
    hasMore,
  });

  const handlePostCreated = (newPost: any) => {
    setPosts([newPost, ...posts]);
  };

  const handlePostDeleted = (postId: number) => {
    setPosts(posts.filter((p) => p.id !== postId));
  };

  const filteredPosts = posts.filter((post) =>
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fcfaff] via-white to-[#f5f3ff] flex flex-col items-center justify-center px-4">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="text-purple-600 w-8 h-8" />
          </div>
        </div>
        <p className="mt-6 text-purple-900 font-black text-lg md:text-xl animate-pulse tracking-tight text-center">Light Web Community</p>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 18) return '☀️';
    return '🌙';
  };

  const currentId = currentUser ? (currentUser.userId || currentUser.id) : null;
  const userName = currentUser?.name?.split(' ')[0] || 'Friend';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcfaff] via-white to-[#f5f3ff] pb-20">
      {/* Global Notification Listener */}
      <GlobalNotificationListener currentUser={currentUser} />

      {/* Welcome Section */}
      {showWelcome && (
        <div className="relative bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 pt-16 md:pt-24 pb-12 md:pb-16 overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[80%] bg-white rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[80%] bg-white rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            <div className="flex items-start justify-between gap-4 mb-6 md:mb-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
                  <span className="text-3xl md:text-4xl animate-bounce">{getGreetingIcon()}</span>
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-white tracking-tight break-words">
                    {getGreeting()}, <span className="text-yellow-200">{userName}</span>!
                  </h2>
                </div>
                <p className="text-white/80 text-sm md:text-lg font-medium max-w-2xl">
                  {t('welcomeMessage')}
                </p>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="p-2 text-white/60 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft size={20} className="rotate-180 md:w-6 md:h-6" />
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20 hover:bg-white/15 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">{posts.length}</div>
                <p className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-wide">{t('available')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20 hover:bg-white/15 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">∞</div>
                <p className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-wide">{t('connections')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20 hover:bg-white/15 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">24/7</div>
                <p className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-wide">{t('realtime')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20 hover:bg-white/15 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">🔒</div>
                <p className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-wide">{t('secure')}</p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full h-16 md:h-24 bg-gradient-to-t from-[#fcfaff] to-transparent"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 mt-4 relative z-20">


        {/* Post Composer */}
        <PostComposer currentUser={currentUser} onPostCreated={handlePostCreated} />

        {/* Posts Feed */}
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-2xl md:rounded-[3rem] p-12 md:p-20 text-center shadow-xl shadow-gray-100/50 border border-gray-100 hover:shadow-2xl transition-all">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-8 text-purple-300 shadow-lg shadow-purple-100/30">
                <MessageSquare size={40} className="md:w-12 md:h-12" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-3 md:mb-4">{t('noPosts')}</h3>
              <p className="text-gray-500 font-medium max-w-xs mx-auto text-sm md:text-base">
                Be the first to share your thoughts with the community!
              </p>
            </div>
          ) : (
            <>
              {filteredPosts.map((post, idx) => (
                <div
                  key={post.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <PostCard
                    post={post}
                    currentUserId={currentId}
                    isAdmin={currentUser?.isAdmin}
                    onDelete={handlePostDeleted}
                  />
                </div>
              ))}
              
              {hasMore && (
                <div ref={observerTarget} className="flex justify-center py-8">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-purple-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">Loading more posts...</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
