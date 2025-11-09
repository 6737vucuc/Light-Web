'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Settings, Grid, Bookmark, UserPlus, MessageCircle, MoreHorizontal, 
  Lock, Heart, MessageSquare, BookOpen, ChevronLeft, Menu, Plus,
  CheckCircle, Clock, TrendingUp, Play, Home, Search, PlusSquare
} from 'lucide-react';
import Image from 'next/image';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  website?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isPrivate: boolean;
  hideFollowers: boolean;
  hideFollowing: boolean;
}

interface Post {
  id: number;
  userId: number;
  imageUrl?: string;
  videoUrl?: string;
  likesCount: number;
  commentsCount: number;
  mediaType?: string;
  createdAt: string;
}

interface Lesson {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
}

interface LessonProgress {
  lessonId: number;
  completed: boolean;
  progress: number;
  lastWatchedAt: string;
  completedAt: string | null;
  lesson: Lesson;
}

interface Highlight {
  id: number;
  title: string;
  coverImage: string;
  storiesCount: number;
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'lessons' | 'tagged'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestPending, setFollowRequestPending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [canViewProfile, setCanViewProfile] = useState(true);

  const [lessonStats, setLessonStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    inProgressLessons: 0,
    completionRate: 0,
  });

  const isOwnProfile = currentUser?.id === parseInt(userId);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Get current user
      let currentUserId = null;
      const meResponse = await fetch('/api/auth/me');
      if (meResponse.ok) {
        const meData = await meResponse.json();
        setCurrentUser(meData.user);
        currentUserId = meData.user?.id;
      }

      // Get profile user data
      const userResponse = await fetch(`/api/users/${userId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);

        // Check if can view profile
        if (userData.user.isPrivate && !userData.isFollowing && userData.user.id !== currentUserId) {
          setCanViewProfile(false);
        } else {
          setCanViewProfile(true);
        }

        setIsFollowing(userData.isFollowing || false);
        setFollowRequestPending(userData.isPending || false);
      }

      // Only fetch content if can view profile
      if (canViewProfile || isOwnProfile) {
        // Get user posts
        const postsResponse = await fetch(`/api/posts/user/${userId}`);
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          setPosts(postsData.posts || []);
        }

        // Get tagged posts
        const taggedResponse = await fetch(`/api/posts/tagged/${userId}`);
        if (taggedResponse.ok) {
          const taggedData = await taggedResponse.json();
          setTaggedPosts(taggedData.posts || []);
        }

        // Get lesson progress
        if (isOwnProfile || isFollowing) {
          const progressResponse = await fetch(`/api/lessons/progress/user/${userId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setLessonProgress(progressData.progress || []);
            calculateLessonStats(progressData.progress || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateLessonStats = (progress: LessonProgress[]) => {
    const total = progress.length;
    const completed = progress.filter(p => p.completed).length;
    const inProgress = progress.filter(p => !p.completed && p.progress > 0).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    setLessonStats({
      totalLessons: total,
      completedLessons: completed,
      inProgressLessons: inProgress,
      completionRate: rate,
    });
  };

  const handleFollow = async () => {
    try {
      const response = await fetch(`/api/follow/${userId}`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'pending') {
          setFollowRequestPending(true);
        } else {
          setIsFollowing(true);
        }
        fetchData();
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async () => {
    try {
      const response = await fetch(`/api/follow/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        setIsFollowing(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getMediaUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http')) return url;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${url}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 text-lg mb-4">User not found</p>
          <button
            onClick={() => router.push('/community')}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold"
          >
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="w-full px-4">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => router.push('/community')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-1">
              <h1 className="text-base font-semibold">{user.username}</h1>
              {user.isPrivate && <Lock className="w-3 h-3 text-gray-600" />}
            </div>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
            >
              <Menu className="w-6 h-6" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-4 top-12 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 w-48">
                  {isOwnProfile ? (
                    <button
                      onClick={() => router.push('/settings')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  ) : (
                    <>
                      <button className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm">
                        Share Profile
                      </button>
                      <button className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 text-sm">
                        Block User
                      </button>
                      <button className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 text-sm">
                        Report
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Profile Info */}
      <div className="w-full px-4 py-4">
        {/* Avatar and Stats */}
        <div className="flex items-center gap-6 mb-4">
          {/* Avatar */}
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
            {user.avatar ? (
              <Image
                src={getAvatarUrl(user.avatar)}
                alt={user.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-2xl">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 flex justify-around text-center">
            <div>
              <div className="font-semibold text-sm md:text-base">{user.postsCount}</div>
              <div className="text-xs md:text-sm text-gray-600">posts</div>
            </div>
            {!user.hideFollowers && (
              <button className="hover:opacity-70 transition-opacity">
                <div className="font-semibold text-sm md:text-base">{user.followersCount}</div>
                <div className="text-xs md:text-sm text-gray-600">followers</div>
              </button>
            )}
            {!user.hideFollowing && (
              <button className="hover:opacity-70 transition-opacity">
                <div className="font-semibold text-sm md:text-base">{user.followingCount}</div>
                <div className="text-xs md:text-sm text-gray-600">following</div>
              </button>
            )}
          </div>
        </div>

        {/* Name and Bio */}
        <div className="mb-4">
          <div className="font-semibold text-sm mb-1">{user.name}</div>
          {user.bio && (
            <div className="text-sm text-gray-800 whitespace-pre-wrap mb-2">{user.bio}</div>
          )}
          {user.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-900 hover:underline font-semibold"
            >
              {user.website}
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          {isOwnProfile ? (
            <>
              <button
                onClick={() => router.push('/settings')}
                className="flex-1 px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm font-semibold"
              >
                Edit Profile
              </button>
              <button
                className="flex-1 px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm font-semibold"
              >
                Share Profile
              </button>
            </>
          ) : (
            <>
              {isFollowing ? (
                <button
                  onClick={handleUnfollow}
                  className="flex-1 px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm font-semibold"
                >
                  Following
                </button>
              ) : followRequestPending ? (
                <button
                  disabled
                  className="flex-1 px-4 py-1.5 bg-gray-200 rounded-lg text-sm font-semibold cursor-not-allowed"
                >
                  Requested
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  className="flex-1 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-semibold"
                >
                  Follow
                </button>
              )}
              <button
                onClick={() => router.push(`/messages?userId=${userId}`)}
                className="flex-1 px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm font-semibold"
              >
                Message
              </button>
            </>
          )}
        </div>

        {/* Highlights */}
        <div className="flex gap-4 overflow-x-auto pb-4 mb-2 scrollbar-hide">
          {isOwnProfile && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                <Plus className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs text-gray-600">New</span>
            </div>
          )}
          {highlights.map((highlight) => (
            <div key={highlight.id} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-16 h-16 rounded-full border-2 border-gray-300 overflow-hidden cursor-pointer">
                <Image
                  src={getMediaUrl(highlight.coverImage)}
                  alt={highlight.title}
                  width={64}
                  height={64}
                  className="object-cover"
                  unoptimized
                />
              </div>
              <span className="text-xs text-gray-800 truncate w-16 text-center">{highlight.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Private Account Message */}
      {!canViewProfile && user.isPrivate && (
        <div className="text-center py-12 px-4">
          <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">This Account is Private</h3>
          <p className="text-gray-600 text-sm mb-4">Follow this account to see their posts</p>
        </div>
      )}

      {/* Tabs */}
      {canViewProfile && (
        <>
          <div className="border-t border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 border-t-2 transition-colors ${
                  activeTab === 'posts'
                    ? 'border-gray-900'
                    : 'border-transparent text-gray-400'
                }`}
              >
                <Grid className="w-6 h-6" strokeWidth={activeTab === 'posts' ? 2 : 1.5} />
              </button>

              {(isOwnProfile || isFollowing) && (
                <button
                  onClick={() => setActiveTab('lessons')}
                  className={`flex-1 py-3 flex items-center justify-center gap-2 border-t-2 transition-colors ${
                    activeTab === 'lessons'
                      ? 'border-gray-900'
                      : 'border-transparent text-gray-400'
                  }`}
                >
                  <BookOpen className="w-6 h-6" strokeWidth={activeTab === 'lessons' ? 2 : 1.5} />
                </button>
              )}

              <button
                onClick={() => setActiveTab('tagged')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 border-t-2 transition-colors ${
                  activeTab === 'tagged'
                    ? 'border-gray-900'
                    : 'border-transparent text-gray-400'
                }`}
              >
                <UserPlus className="w-6 h-6" strokeWidth={activeTab === 'tagged' ? 2 : 1.5} />
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="w-full">
            {/* Posts Grid */}
            {activeTab === 'posts' && (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.length === 0 ? (
                  <div className="col-span-3 text-center py-12">
                    <Grid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-sm">No posts yet</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className="relative aspect-square bg-gray-100 cursor-pointer group"
                      onClick={() => router.push(`/posts/${post.id}`)}
                    >
                      {post.imageUrl || post.videoUrl ? (
                        <>
                          <Image
                            src={getMediaUrl(post.imageUrl || post.videoUrl)}
                            alt="Post"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          {post.mediaType === 'video' && (
                            <div className="absolute top-2 right-2">
                              <Play className="w-5 h-5 text-white drop-shadow-lg" fill="white" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-4 text-white">
                              <div className="flex items-center gap-1">
                                <Heart className="w-6 h-6" fill="white" />
                                <span className="font-semibold">{post.likesCount}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-6 h-6" fill="white" />
                                <span className="font-semibold">{post.commentsCount}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Grid className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Lessons Tab */}
            {activeTab === 'lessons' && (
              <div className="p-4">
                {lessonProgress.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-sm">No lessons yet</p>
                  </div>
                ) : (
                  <>
                    {/* Lesson Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          {lessonStats.totalLessons}
                        </div>
                        <div className="text-xs text-gray-600">Total</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {lessonStats.completedLessons}
                        </div>
                        <div className="text-xs text-gray-600">Completed</div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          {lessonStats.completionRate}%
                        </div>
                        <div className="text-xs text-gray-600">Progress</div>
                      </div>
                    </div>

                    {/* Lessons List */}
                    <div className="space-y-3">
                      {lessonProgress.map((progress) => (
                        <div
                          key={progress.lessonId}
                          onClick={() => router.push(`/lessons/${progress.lessonId}`)}
                          className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            {progress.lesson.imageUrl && (
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={getMediaUrl(progress.lesson.imageUrl)}
                                  alt={progress.lesson.title}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm mb-1 truncate">
                                {progress.lesson.title}
                              </h3>
                              <div className="flex items-center gap-2 mb-2">
                                {progress.completed ? (
                                  <span className="flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    Completed
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-orange-600">
                                    <Clock className="w-3 h-3" />
                                    In Progress
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    progress.completed ? 'bg-green-500' : 'bg-orange-500'
                                  }`}
                                  style={{ width: `${progress.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tagged Posts Grid */}
            {activeTab === 'tagged' && (
              <div className="grid grid-cols-3 gap-0.5">
                {taggedPosts.length === 0 ? (
                  <div className="col-span-3 text-center py-12">
                    <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-sm">No tagged posts</p>
                  </div>
                ) : (
                  taggedPosts.map((post) => (
                    <div
                      key={post.id}
                      className="relative aspect-square bg-gray-100 cursor-pointer group"
                      onClick={() => router.push(`/posts/${post.id}`)}
                    >
                      {post.imageUrl || post.videoUrl ? (
                        <>
                          <Image
                            src={getMediaUrl(post.imageUrl || post.videoUrl)}
                            alt="Tagged post"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-4 text-white">
                              <div className="flex items-center gap-1">
                                <Heart className="w-6 h-6" fill="white" />
                                <span className="font-semibold">{post.likesCount}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-6 h-6" fill="white" />
                                <span className="font-semibold">{post.commentsCount}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <UserPlus className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around h-14">
          <button
            onClick={() => router.push('/community')}
            className="flex-1 flex items-center justify-center hover:bg-gray-50 transition-colors h-full"
          >
            <Home className="w-7 h-7 text-gray-800" />
          </button>

          <button
            className="flex-1 flex items-center justify-center hover:bg-gray-50 transition-colors h-full"
          >
            <Search className="w-7 h-7 text-gray-800" />
          </button>

          <button
            className="flex-1 flex items-center justify-center hover:bg-gray-50 transition-colors h-full"
          >
            <PlusSquare className="w-7 h-7 text-gray-800" />
          </button>

          <button
            className="flex-1 flex items-center justify-center hover:bg-gray-50 transition-colors h-full"
          >
            <Heart className="w-7 h-7 text-gray-800" />
          </button>

          <button
            className="flex-1 flex items-center justify-center hover:bg-gray-50 transition-colors h-full"
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

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
