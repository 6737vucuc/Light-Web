'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, Settings, Grid, BookOpen, Bookmark, UserPlus, 
  MessageCircle, MoreHorizontal, Lock, Globe, CheckCircle,
  Clock, TrendingUp, Award, Play, ChevronRight, Edit2, X, Check
} from 'lucide-react';
import Image from 'next/image';
import DailyVerse from '@/components/verses/DailyVerse';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  coverPhoto: string | null;
  bio: string | null;
  website: string | null;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isPrivate: boolean;
  usernameLastChanged: string | null;
}

interface Post {
  id: number;
  imageUrl: string | null;
  videoUrl: string | null;
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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'lessons' | 'tagged' | 'saved'>('posts');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  
  // Edit states
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [daysUntilUsernameChange, setDaysUntilUsernameChange] = useState(0);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [lessonStats, setLessonStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    inProgressLessons: 0,
    completionRate: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch user info
      const userResponse = await fetch('/api/auth/me');
      if (!userResponse.ok) {
        router.push('/auth/login');
        return;
      }
      const userData = await userResponse.json();
      setUser(userData.user);
      setEditName(userData.user.name);
      setEditUsername(userData.user.username);
      setEditBio(userData.user.bio || '');
      setEditWebsite(userData.user.website || '');
      
      // Check username change eligibility
      checkUsernameChangeEligibility(userData.user.usernameLastChanged);

      // Fetch posts
      const postsResponse = await fetch(`/api/posts/user/${userData.user.id}`);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setPosts(postsData.posts || []);
      }

      // Fetch saved posts
      const savedResponse = await fetch('/api/posts/saved');
      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        setSavedPosts(savedData.posts || []);
      }

      // Fetch tagged posts
      const taggedResponse = await fetch(`/api/posts/tagged/${userData.user.id}`);
      if (taggedResponse.ok) {
        const taggedData = await taggedResponse.json();
        setTaggedPosts(taggedData.posts || []);
      }

      // Fetch lesson progress
      const progressResponse = await fetch('/api/lessons/progress');
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setLessonProgress(progressData.progress || []);
        calculateLessonStats(progressData.progress || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameChangeEligibility = (lastChanged: string | null) => {
    if (!lastChanged) {
      setCanChangeUsername(true);
      return;
    }

    const lastChangedDate = new Date(lastChanged);
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastChangedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceChange >= 30) {
      setCanChangeUsername(true);
      setDaysUntilUsernameChange(0);
    } else {
      setCanChangeUsername(false);
      setDaysUntilUsernameChange(30 - daysSinceChange);
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

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Avatar uploaded successfully:', data);
        // Update user state immediately
        if (user) {
          setUser({ ...user, avatar: data.avatarUrl });
        }
        // Refresh data
        fetchData();
      } else {
        const error = await response.json();
        console.error('Avatar upload failed:', error);
        alert(error.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar');
    }
  };

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const { url } = await uploadResponse.json();
        
        await fetch('/api/profile/cover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverPhoto: url }),
        });

        fetchData();
      }
    } catch (error) {
      console.error('Error uploading cover photo:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          bio: editBio,
          website: editWebsite,
        }),
      });

      if (response.ok) {
        fetchData();
        setIsEditingProfile(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleSaveUsername = async () => {
    if (!canChangeUsername) {
      setUsernameError(`You can change your username again in ${daysUntilUsernameChange} days`);
      return;
    }

    if (editUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(editUsername)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return;
    }

    try {
      const response = await fetch('/api/profile/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editUsername }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchData();
        setIsEditingUsername(false);
        setUsernameError('');
      } else {
        setUsernameError(data.error || 'Failed to update username');
      }
    } catch (error) {
      console.error('Error updating username:', error);
      setUsernameError('Failed to update username');
    }
  };

  const handleTogglePrivacy = async () => {
    try {
      const response = await fetch('/api/profile/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrivate: !user?.isPrivate }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <p className="text-gray-900">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Daily Verse Modal */}
      <DailyVerse />
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
        
        <button
          onClick={() => coverInputRef.current?.click()}
          className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Edit Cover
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverPhotoChange}
          className="hidden"
        />
      </div>

      {/* Profile Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-20 mb-6">
          <div className="flex items-end justify-between">
            {/* Avatar */}
            <div className="relative">
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
              
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
              >
                <Camera className="w-5 h-5 text-gray-700" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
              <button
                onClick={() => setShowPrivacySettings(!showPrivacySettings)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            {user.isPrivate && (
              <Lock className="w-5 h-5 text-gray-900" />
            )}
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <p className="text-gray-600">@{user.username}</p>
            <button
              onClick={() => setIsEditingUsername(true)}
              className="text-purple-600 hover:text-purple-700 text-sm"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

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
            <button className="hover:text-purple-600 transition-colors">
              <strong className="text-gray-900">{user.postsCount}</strong>
              <span className="text-gray-600 ml-1">posts</span>
            </button>
            <button className="hover:text-purple-600 transition-colors">
              <strong className="text-gray-900">{user.followersCount}</strong>
              <span className="text-gray-600 ml-1">followers</span>
            </button>
            <button className="hover:text-purple-600 transition-colors">
              <strong className="text-gray-900">{user.followingCount}</strong>
              <span className="text-gray-600 ml-1">following</span>
            </button>
          </div>
        </div>

        {/* Privacy Settings Panel */}
        {showPrivacySettings && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h3>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Private Account</p>
                <p className="text-sm text-gray-600">Only followers can see your posts</p>
              </div>
              <button
                onClick={handleTogglePrivacy}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  user.isPrivate ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    user.isPrivate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="text-gray-900 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Username Modal */}
        {isEditingUsername && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Change Username</h3>
                <button
                  onClick={() => {
                    setIsEditingUsername(false);
                    setUsernameError('');
                  }}
                  className="text-gray-900 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {!canChangeUsername && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      You can change your username again in <strong>{daysUntilUsernameChange} days</strong>
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => {
                      setEditUsername(e.target.value);
                      setUsernameError('');
                    }}
                    disabled={!canChangeUsername}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
                  />
                  {usernameError && (
                    <p className="text-sm text-red-600 mt-1">{usernameError}</p>
                  )}
                  <p className="text-xs text-gray-900 mt-1">
                    Username can only contain letters, numbers, and underscores
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveUsername}
                    disabled={!canChangeUsername}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Username
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingUsername(false);
                      setUsernameError('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
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
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div>
                {posts.length === 0 ? (
                  <div className="text-center py-12">
                    <Grid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-900 text-lg">No posts yet</p>
                    <button
                      onClick={() => router.push('/community')}
                      className="mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                    >
                      Create Post
                    </button>
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
                              <CheckCircle className="w-5 h-5" />
                              {post.likesCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-5 h-5" />
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
            {activeTab === 'lessons' && (
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
                    <p className="text-gray-900 text-lg">No lessons started yet</p>
                    <button
                      onClick={() => router.push('/lessons')}
                      className="mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                    >
                      Browse Lessons
                    </button>
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
                          <ChevronRight className="w-5 h-5 text-gray-900 flex-shrink-0" />
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
                    <p className="text-gray-900 text-lg">No tagged posts</p>
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
            {activeTab === 'saved' && (
              <div>
                {savedPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-900 text-lg">No saved posts</p>
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
      </div>
    </div>
  );
}
