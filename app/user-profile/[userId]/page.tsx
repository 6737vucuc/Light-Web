'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Settings, Grid, Bookmark, UserPlus, UserMinus, UserCheck, MessageCircle,
  MoreHorizontal, Lock, Globe, ChevronDown, Heart, MessageSquare, BookOpen,
  CheckCircle, Clock, TrendingUp, Play, ChevronRight, Ban, Flag, Share2
} from 'lucide-react';
import Image from 'next/image';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  coverPhoto?: string;
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
  const [activeTab, setActiveTab] = useState<'posts' | 'lessons' | 'tagged' | 'saved'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestPending, setFollowRequestPending] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [canViewProfile, setCanViewProfile] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

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
        
        // Check if blocked
        if (userData.isBlocked) {
          setIsBlocked(true);
          setCanViewProfile(false);
          setIsLoading(false);
          return;
        }

        // Check if can view profile (if private and not following)
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

        // Get lesson progress (only for own profile or if following)
        if (isOwnProfile || isFollowing) {
          const progressResponse = await fetch(`/api/lessons/progress/user/${userId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setLessonProgress(progressData.progress || []);
            calculateLessonStats(progressData.progress || []);
          }
        }

        // Get saved posts (only for own profile)
        if (isOwnProfile) {
          const savedResponse = await fetch(`/api/posts/saved`);
          if (savedResponse.ok) {
            const savedData = await savedResponse.json();
            setSavedPosts(savedData.posts || []);
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
      const response = await fetch(`/api/follow/${userId}`, {
        method: 'POST',
      });

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
      const response = await fetch(`/api/follow/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIsFollowing(false);
        setFollowRequestPending(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const handleBlock = async () => {
    if (!confirm('Are you sure you want to block this user?')) return;

    try {
      const response = await fetch(`/api/privacy/block/${userId}`, {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/community');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const handleReport = () => {
    // Implement report functionality
    alert('Report functionality will be implemented');
  };

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/user-profile/${userId}`;
    navigator.clipboard.writeText(profileUrl);
    alert('Profile link copied to clipboard!');
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Ban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Not Available</h2>
          <p className="text-gray-600">This profile is not accessible</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">User not found</p>
          <button
            onClick={() => router.push('/community')}
            className="mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
          >
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Cover Photo */}
      <div className="relative h-64 bg-gradient-to-r from-purple-400 to-blue-400">
        {user.coverPhoto ? (
          <Image
            src={getAvatarUrl(user.coverPhoto)}
            alt="Cover"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500"></div>
        )}
      </div>

      {/* Profile Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-20 mb-6">
          <div className="flex items-end justify-between">
            {/* Avatar */}
            <div className="relative w-40 h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100">
              {user.avatar ? (
                <Image
                  src={getAvatarUrl(user.avatar)}
                  alt={user.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-5xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && (
              <div className="flex items-center gap-2 mb-4">
                {isFollowing ? (
                  <button
                    onClick={handleUnfollow}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors flex items-center gap-2 font-medium"
                  >
                    <UserCheck className="w-4 h-4" />
                    Following
                  </button>
                ) : followRequestPending ? (
                  <button
                    disabled
                    className="px-6 py-2 bg-gray-200 rounded-lg flex items-center gap-2 font-medium cursor-not-allowed"
                  >
                    <Clock className="w-4 h-4" />
                    Requested
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
                  >
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </button>
                )}

                <button
                  onClick={() => router.push(`/messages?userId=${userId}`)}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                      <button
                        onClick={handleShare}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Share Profile
                      </button>
                      <button
                        onClick={handleBlock}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                      >
                        <Ban className="w-4 h-4" />
                        Block User
                      </button>
                      <button
                        onClick={handleReport}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                      >
                        <Flag className="w-4 h-4" />
                        Report
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isOwnProfile && (
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => router.push('/profile')}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 font-medium"
                >
                  <Settings className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            {user.isPrivate && (
              <Lock className="w-5 h-5 text-gray-500" />
            )}
          </div>
          
          <p className="text-gray-600 mb-4">@{user.username}</p>

          {user.bio && (
            <p className="text-gray-700 mb-4 whitespace-pre-wrap">{user.bio}</p>
          )}

          {user.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-4"
            >
              <Globe className="w-4 h-4" />
              {user.website}
            </a>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div>
              <strong className="text-gray-900">{user.postsCount}</strong>
              <span className="text-gray-600 ml-1">posts</span>
            </div>
            {!user.hideFollowers && (
              <button className="hover:text-purple-600 transition-colors">
                <strong className="text-gray-900">{user.followersCount}</strong>
                <span className="text-gray-600 ml-1">followers</span>
              </button>
            )}
            {!user.hideFollowing && (
              <button className="hover:text-purple-600 transition-colors">
                <strong className="text-gray-900">{user.followingCount}</strong>
                <span className="text-gray-600 ml-1">following</span>
              </button>
            )}
          </div>
        </div>

        {/* Private Account Message */}
        {!canViewProfile && user.isPrivate && (
          <div className="bg-white rounded-xl shadow-md p-12 mb-6 text-center">
            <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">This Account is Private</h3>
            <p className="text-gray-600 mb-4">Follow this account to see their posts and lessons</p>
            {!isFollowing && !followRequestPending && (
              <button
                onClick={handleFollow}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
              >
                Follow
              </button>
            )}
          </div>
        )}

        {/* Tabs - Only show if can view profile */}
        {canViewProfile && (
          <>
            <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'posts'
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                  Posts
                </button>

                {(isOwnProfile || isFollowing) && (
                  <button
                    onClick={() => setActiveTab('lessons')}
                    className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                      activeTab === 'lessons'
                        ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    Lessons
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('tagged')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'tagged'
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <UserPlus className="w-5 h-5" />
                  Tagged
                </button>

                {isOwnProfile && (
                  <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                      activeTab === 'saved'
                        ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Bookmark className="w-5 h-5" />
                    Saved
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Posts Tab */}
                {activeTab === 'posts' && (
                  <div>
                    {posts.length === 0 ? (
                      <div className="text-center py-12">
                        <Grid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No posts yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 sm:gap-2">
                        {posts.map((post) => (
                          <div
                            key={post.id}
                            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => router.push(`/community?post=${post.id}`)}
                          >
                            {post.imageUrl && (
                              <Image
                                src={post.imageUrl}
                                alt="Post"
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-200"
                                unoptimized
                              />
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-4 text-white">
                                <span className="flex items-center gap-1">
                                  <Heart className="w-5 h-5" />
                                  {post.likesCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-5 h-5" />
                                  {post.commentsCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Lessons Tab */}
                {activeTab === 'lessons' && (isOwnProfile || isFollowing) && (
                  <div>
                    {/* Lesson Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-600 text-sm font-medium">Total</p>
                            <p className="text-2xl font-bold text-blue-900">{lessonStats.totalLessons}</p>
                          </div>
                          <BookOpen className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-600 text-sm font-medium">Completed</p>
                            <p className="text-2xl font-bold text-green-900">{lessonStats.completedLessons}</p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-orange-600 text-sm font-medium">In Progress</p>
                            <p className="text-2xl font-bold text-orange-900">{lessonStats.inProgressLessons}</p>
                          </div>
                          <Clock className="w-8 h-8 text-orange-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-600 text-sm font-medium">Completion</p>
                            <p className="text-2xl font-bold text-purple-900">{lessonStats.completionRate}%</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-purple-600" />
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Overall Progress</h3>
                        <span className="text-xl font-bold text-purple-600">{lessonStats.completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${lessonStats.completionRate}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Lessons List */}
                    {lessonProgress.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No lessons started yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {lessonProgress.map((progress) => (
                          <div
                            key={progress.lessonId}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/lessons/${progress.lessonId}`)}
                          >
                            <div className="flex items-center gap-4">
                              {progress.lesson.imageUrl && (
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                  <Image
                                    src={progress.lesson.imageUrl}
                                    alt={progress.lesson.title}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">
                                  {progress.lesson.title}
                                </h4>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                  {progress.completed ? (
                                    <span className="flex items-center text-green-600 font-medium">
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Completed
                                    </span>
                                  ) : (
                                    <span className="flex items-center text-orange-600 font-medium">
                                      <Play className="w-4 h-4 mr-1" />
                                      {progress.progress}%
                                    </span>
                                  )}
                                  <span>
                                    {new Date(progress.lastWatchedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {!progress.completed && (
                                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-purple-600 to-blue-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${progress.progress}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tagged Tab */}
                {activeTab === 'tagged' && (
                  <div>
                    {taggedPosts.length === 0 ? (
                      <div className="text-center py-12">
                        <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No tagged posts</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 sm:gap-2">
                        {taggedPosts.map((post) => (
                          <div
                            key={post.id}
                            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => router.push(`/community?post=${post.id}`)}
                          >
                            {post.imageUrl && (
                              <Image
                                src={post.imageUrl}
                                alt="Post"
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-200"
                                unoptimized
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Saved Tab */}
                {activeTab === 'saved' && isOwnProfile && (
                  <div>
                    {savedPosts.length === 0 ? (
                      <div className="text-center py-12">
                        <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No saved posts</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 sm:gap-2">
                        {savedPosts.map((post) => (
                          <div
                            key={post.id}
                            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => router.push(`/community?post=${post.id}`)}
                          >
                            {post.imageUrl && (
                              <Image
                                src={post.imageUrl}
                                alt="Post"
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-200"
                                unoptimized
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
