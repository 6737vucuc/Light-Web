'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Settings, Grid3x3, Bookmark, UserPlus, UserMinus, MessageCircle,
  MoreHorizontal, Lock, Globe, ChevronDown, Heart, MessageSquare
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
  createdAt: string;
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
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestPending, setFollowRequestPending] = useState(false);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [canViewProfile, setCanViewProfile] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
          
          // Check if can view profile (if private and not following)
          if (userData.user.isPrivate && !userData.isFollowing && userData.user.id !== currentUserId) {
            setCanViewProfile(false);
          }
        }

        // Check follow status
        const followResponse = await fetch(`/api/follow/status/${userId}`);
        if (followResponse.ok) {
          const followData = await followResponse.json();
          setIsFollowing(followData.isFollowing);
          setFollowRequestPending(followData.isPending);
        }

        // Get user posts (only if can view)
        if (canViewProfile) {
          const postsResponse = await fetch(`/api/posts/user/${userId}`);
          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            setPosts(postsData.posts || []);
          }

          // Get saved posts (only for own profile)
          if (currentUserId === parseInt(userId)) {
            const savedResponse = await fetch(`/api/posts/saved`);
            if (savedResponse.ok) {
              const savedData = await savedResponse.json();
              setSavedPosts(savedData.posts || []);
            }
          }

          // Get tagged posts
          const taggedResponse = await fetch(`/api/posts/tagged/${userId}`);
          if (taggedResponse.ok) {
            const taggedData = await taggedResponse.json();
            setTaggedPosts(taggedData.posts || []);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId, canViewProfile]);

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const isOwnProfile = currentUser?.id === parseInt(userId);

  const handleFollowToggle = async () => {
    try {
      const response = await fetch(`/api/follow/${userId}`, {
        method: isFollowing ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
        setFollowRequestPending(data.isPending);
        
        // Refresh user data to update follower count
        const userResponse = await fetch(`/api/users/${userId}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.user);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleMessage = () => {
    router.push(`/messages?userId=${userId}`);
  };

  const handlePrivacyToggle = async () => {
    try {
      const response = await fetch('/api/users/update-privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPrivate: !user?.isPrivate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(prev => prev ? { ...prev, isPrivate: data.isPrivate } : null);
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">User not found</h2>
          <button
            onClick={() => router.push('/community')}
            className="text-blue-600 hover:underline"
          >
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 sticky top-0 z-50 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.push('/community')}
              className="text-2xl font-bold"
            >
              Light Community
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-16 mb-12">
          {/* Avatar */}
          <div className="flex justify-center md:justify-start">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border border-gray-200">
              <Image
                src={getAvatarUrl(user.avatar)}
                alt={user.name}
                width={160}
                height={160}
                className="object-cover w-full h-full"
                unoptimized
              />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            {/* Username and Actions */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-6">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-light">{user.username}</h1>
                {user.isPrivate && (
                  <Lock className="w-4 h-4 text-gray-600" />
                )}
              </div>

              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <>
                    <button
                      onClick={() => router.push('/profile')}
                      className="px-6 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Edit Profile
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
                        className="px-6 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-sm transition-colors flex items-center gap-1"
                      >
                        {user.isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      
                      {showPrivacyMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                          <button
                            onClick={handlePrivacyToggle}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                          >
                            {user.isPrivate ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                            <div>
                              <div className="font-semibold text-sm">
                                {user.isPrivate ? 'Switch to Public' : 'Switch to Private'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.isPrivate ? 'Anyone can see your posts' : 'Only followers can see'}
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => router.push('/profile?tab=privacy')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                          >
                            <Settings className="w-5 h-5" />
                            <div className="font-semibold text-sm">Privacy Settings</div>
                          </button>
                        </div>
                      )}
                    </div>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <Settings className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleFollowToggle}
                      className={`px-6 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                        isFollowing
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                          : followRequestPending
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4 inline mr-1" />
                          Following
                        </>
                      ) : followRequestPending ? (
                        'Requested'
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 inline mr-1" />
                          Follow
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleMessage}
                      className="px-6 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Message
                    </button>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreHorizontal className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mb-6 justify-center md:justify-start">
              <div className="text-center md:text-left">
                <span className="font-semibold">{user.postsCount}</span>
                <span className="text-gray-600 ml-1">posts</span>
              </div>
              <button 
                className="text-center md:text-left hover:opacity-70 transition-opacity"
                disabled={user.hideFollowers && !isOwnProfile}
              >
                <span className="font-semibold">{user.followersCount}</span>
                <span className="text-gray-600 ml-1">followers</span>
              </button>
              <button 
                className="text-center md:text-left hover:opacity-70 transition-opacity"
                disabled={user.hideFollowing && !isOwnProfile}
              >
                <span className="font-semibold">{user.followingCount}</span>
                <span className="text-gray-600 ml-1">following</span>
              </button>
            </div>

            {/* Bio */}
            <div className="text-center md:text-left">
              <div className="font-semibold mb-1">{user.name}</div>
              {user.bio && (
                <div className="text-sm whitespace-pre-wrap mb-2">{user.bio}</div>
              )}
              {user.website && (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-900 font-semibold hover:underline"
                >
                  {user.website}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Private Account Message */}
        {!canViewProfile && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-gray-900 mb-6">
              <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-light mb-2">This Account is Private</h2>
            <p className="text-gray-600 mb-6">Follow to see their photos and videos.</p>
            <button
              onClick={handleFollowToggle}
              className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
            >
              {followRequestPending ? 'Requested' : 'Follow'}
            </button>
          </div>
        )}

        {/* Tabs and Content */}
        {canViewProfile && (
          <>
            {/* Tabs */}
            <div className="border-t border-gray-200">
              <div className="flex justify-center gap-16">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`flex items-center gap-2 py-4 border-t-2 transition-colors ${
                    activeTab === 'posts'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-400'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Posts</span>
                </button>
                
                {isOwnProfile && (
                  <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex items-center gap-2 py-4 border-t-2 transition-colors ${
                      activeTab === 'saved'
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-400'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Saved</span>
                  </button>
                )}
                
                <button
                  onClick={() => setActiveTab('tagged')}
                  className={`flex items-center gap-2 py-4 border-t-2 transition-colors ${
                    activeTab === 'tagged'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-400'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Tagged</span>
                </button>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="mt-8">
              {activeTab === 'posts' && (
                <div className="grid grid-cols-3 gap-1">
                  {posts.length === 0 ? (
                    <div className="col-span-3 text-center py-16">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-gray-900 mb-6">
                        <Grid3x3 className="w-12 h-12" />
                      </div>
                      <h2 className="text-2xl font-light mb-2">No Posts Yet</h2>
                      {isOwnProfile && (
                        <p className="text-gray-600">Share your first photo or video</p>
                      )}
                    </div>
                  ) : (
                    posts.map((post) => (
                      <div
                        key={post.id}
                        className="relative aspect-square bg-gray-100 cursor-pointer group overflow-hidden"
                        onClick={() => router.push(`/community?postId=${post.id}`)}
                      >
                        {post.imageUrl && (
                          <Image
                            src={post.imageUrl}
                            alt="Post"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex items-center gap-6 text-white font-semibold">
                            <div className="flex items-center gap-2">
                              <Heart className="w-6 h-6 fill-white" />
                              <span>{post.likesCount}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-6 h-6 fill-white" />
                              <span>{post.commentsCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'saved' && isOwnProfile && (
                <div className="grid grid-cols-3 gap-1">
                  {savedPosts.length === 0 ? (
                    <div className="col-span-3 text-center py-16">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-gray-900 mb-6">
                        <Bookmark className="w-12 h-12" />
                      </div>
                      <h2 className="text-2xl font-light mb-2">No Saved Posts</h2>
                      <p className="text-gray-600">Save posts to see them here</p>
                    </div>
                  ) : (
                    savedPosts.map((post) => (
                      <div
                        key={post.id}
                        className="relative aspect-square bg-gray-100 cursor-pointer group overflow-hidden"
                        onClick={() => router.push(`/community?postId=${post.id}`)}
                      >
                        {post.imageUrl && (
                          <Image
                            src={post.imageUrl}
                            alt="Post"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex items-center gap-6 text-white font-semibold">
                            <div className="flex items-center gap-2">
                              <Heart className="w-6 h-6 fill-white" />
                              <span>{post.likesCount}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-6 h-6 fill-white" />
                              <span>{post.commentsCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'tagged' && (
                <div className="grid grid-cols-3 gap-1">
                  {taggedPosts.length === 0 ? (
                    <div className="col-span-3 text-center py-16">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-gray-900 mb-6">
                        <UserPlus className="w-12 h-12" />
                      </div>
                      <h2 className="text-2xl font-light mb-2">No Tagged Posts</h2>
                      <p className="text-gray-600">Photos and videos you're tagged in will appear here</p>
                    </div>
                  ) : (
                    taggedPosts.map((post) => (
                      <div
                        key={post.id}
                        className="relative aspect-square bg-gray-100 cursor-pointer group overflow-hidden"
                        onClick={() => router.push(`/community?postId=${post.id}`)}
                      >
                        {post.imageUrl && (
                          <Image
                            src={post.imageUrl}
                            alt="Post"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex items-center gap-6 text-white font-semibold">
                            <div className="flex items-center gap-2">
                              <Heart className="w-6 h-6 fill-white" />
                              <span>{post.likesCount}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-6 h-6 fill-white" />
                              <span>{post.commentsCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
