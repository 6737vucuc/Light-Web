'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Camera, MapPin, Briefcase, Heart, MessageCircle, UserPlus, MoreHorizontal, 
  Edit, Image as ImageIcon, Video, Users, Info, Globe, Lock, ThumbsUp,
  Share2, Smile, Calendar, Home, GraduationCap, Phone, Mail, Link as LinkIcon
} from 'lucide-react';
import Image from 'next/image';

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  location?: string;
  work?: string;
  education?: string;
  website?: string;
  gender?: string;
  country?: string;
  joinedDate?: string;
}

interface Post {
  id: number;
  userId: number;
  content: string;
  image?: string;
  createdAt: string;
  likes: number;
  comments: number;
}

interface Friend {
  id: number;
  name: string;
  avatar?: string;
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'friends' | 'photos'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [showEditIntro, setShowEditIntro] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedWork, setEditedWork] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const meResponse = await fetch('/api/auth/me');
        if (meResponse.ok) {
          const meData = await meResponse.json();
          setCurrentUser(meData.user);
        }

        // Get profile user data
        const userResponse = await fetch(`/api/users/${userId}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.user);
          setEditedBio(userData.user.bio || '');
          setEditedLocation(userData.user.location || '');
          setEditedWork(userData.user.work || '');
        }

        // Get user posts
        const postsResponse = await fetch(`/api/posts/user/${userId}`);
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          setPosts(postsData.posts || []);
        }

        // Get user friends
        const friendsResponse = await fetch(`/api/friends/${userId}`);
        if (friendsResponse.ok) {
          const friendsData = await friendsResponse.json();
          setFriends(friendsData.friends || []);
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
  }, [userId]);

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getCoverPhotoUrl = (coverPhoto?: string) => {
    if (!coverPhoto) return 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop';
    if (coverPhoto.startsWith('http')) return coverPhoto;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${coverPhoto}`;
  };

  const isOwnProfile = currentUser?.id === parseInt(userId);

  const handleSaveIntro = async () => {
    try {
      const response = await fetch('/api/users/update-profile-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: editedBio,
          location: editedLocation,
          work: editedWork,
        }),
      });

      if (response.ok) {
        setUser(prev => prev ? {
          ...prev,
          bio: editedBio,
          location: editedLocation,
          work: editedWork,
        } : null);
        setShowEditIntro(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">User not found</h2>
          <button
            onClick={() => router.push('/community')}
            className="text-purple-600 hover:underline"
          >
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
          </div>
        </div>
      </div>

      {/* Cover Photo */}
      <div className="bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="relative h-[400px] bg-gradient-to-r from-purple-400 to-blue-500">
            <Image
              src={getCoverPhotoUrl(user.coverPhoto)}
              alt="Cover"
              fill
              className="object-cover"
              unoptimized
            />
            {isOwnProfile && (
              <button className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-100 transition-colors flex items-center gap-2 font-medium">
                <Camera className="w-5 h-5" />
                Edit Cover Photo
              </button>
            )}
          </div>

          {/* Profile Info Section */}
          <div className="px-8 pb-0">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-20 relative">
              {/* Avatar */}
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
                    <Image
                      src={getAvatarUrl(user.avatar)}
                      alt={user.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  {isOwnProfile && (
                    <button className="absolute bottom-2 right-2 bg-gray-200 p-2.5 rounded-full hover:bg-gray-300 transition-colors shadow-md">
                      <Camera className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Name and Stats */}
                <div className="text-center md:text-left mb-4">
                  <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
                  <div className="flex items-center gap-4 mt-2 text-gray-600 justify-center md:justify-start">
                    <button className="hover:underline cursor-pointer font-medium">
                      {friends.length} friends
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4 justify-center md:justify-start">
                {isOwnProfile ? (
                  <>
                    <button 
                      onClick={() => router.push('/profile')}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all flex items-center gap-2 font-medium shadow-md"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all flex items-center gap-2 font-medium shadow-md">
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </button>
                    <button className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-medium">
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                  </>
                )}
                <button className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-t border-gray-300 mt-4">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`px-6 py-4 font-semibold transition-all relative ${
                    activeTab === 'posts'
                      ? 'text-purple-600 border-b-4 border-purple-600'
                      : 'text-gray-600 hover:bg-gray-100 rounded-t-lg'
                  }`}
                >
                  Posts
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`px-6 py-4 font-semibold transition-all relative ${
                    activeTab === 'about'
                      ? 'text-purple-600 border-b-4 border-purple-600'
                      : 'text-gray-600 hover:bg-gray-100 rounded-t-lg'
                  }`}
                >
                  About
                </button>
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`px-6 py-4 font-semibold transition-all relative ${
                    activeTab === 'friends'
                      ? 'text-purple-600 border-b-4 border-purple-600'
                      : 'text-gray-600 hover:bg-gray-100 rounded-t-lg'
                  }`}
                >
                  Friends
                </button>
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`px-6 py-4 font-semibold transition-all relative ${
                    activeTab === 'photos'
                      ? 'text-purple-600 border-b-4 border-purple-600'
                      : 'text-gray-600 hover:bg-gray-100 rounded-t-lg'
                  }`}
                >
                  Photos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Sidebar - Intro & Info */}
          <div className="md:col-span-1 space-y-4">
            {/* Intro Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Intro</h2>
              
              {!showEditIntro ? (
                <>
                  {user.bio && (
                    <p className="text-gray-700 text-center mb-4 px-2">{user.bio}</p>
                  )}

                  <div className="space-y-3">
                    {user.work && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <Briefcase className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <span>Works at <strong>{user.work}</strong></span>
                      </div>
                    )}
                    
                    {user.education && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <GraduationCap className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <span>Studied at <strong>{user.education}</strong></span>
                      </div>
                    )}

                    {user.location && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <Home className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <span>Lives in <strong>{user.location}</strong></span>
                      </div>
                    )}

                    {user.country && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <span>From <strong>{user.country}</strong></span>
                      </div>
                    )}

                    {user.joinedDate && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <span>Joined {new Date(user.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                      </div>
                    )}
                  </div>

                  {isOwnProfile && (
                    <button 
                      onClick={() => setShowEditIntro(true)}
                      className="w-full mt-4 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                    >
                      Edit Details
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea
                      value={editedBio}
                      onChange={(e) => setEditedBio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                      placeholder="Describe yourself..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work</label>
                    <input
                      type="text"
                      value={editedWork}
                      onChange={(e) => setEditedWork(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Where do you work?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Where do you live?"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveIntro}
                      className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowEditIntro(false)}
                      className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Photos Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Photos</h2>
                <button className="text-purple-600 hover:underline text-sm font-medium">
                  See all photos
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <div 
                    key={i} 
                    className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <div className="w-full h-full flex items-center justify-center text-purple-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Friends Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Friends</h2>
                  <p className="text-gray-600 text-sm">{friends.length} friends</p>
                </div>
                <button className="text-purple-600 hover:underline text-sm font-medium">
                  See all friends
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {friends.slice(0, 9).map((friend) => (
                  <div key={friend.id} className="cursor-pointer group">
                    <div className="aspect-square rounded-lg overflow-hidden mb-1 group-hover:opacity-80 transition-opacity">
                      <Image
                        src={getAvatarUrl(friend.avatar)}
                        alt={friend.name}
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <p className="text-xs font-medium text-gray-800 truncate">{friend.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2">
            {activeTab === 'posts' && (
              <div className="space-y-4">
                {/* Create Post (if own profile) */}
                {isOwnProfile && (
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <div className="flex gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        <Image
                          src={getAvatarUrl(currentUser?.avatar)}
                          alt={currentUser?.name}
                          width={40}
                          height={40}
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <button className="flex-1 text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        What's on your mind, {currentUser?.name?.split(' ')[0]}?
                      </button>
                    </div>
                    <div className="border-t pt-3 flex justify-around">
                      <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors flex-1 justify-center">
                        <ImageIcon className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-gray-700">Photo/Video</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors flex-1 justify-center">
                        <Smile className="w-5 h-5 text-yellow-500" />
                        <span className="font-medium text-gray-700">Feeling</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Posts List */}
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <div key={post.id} className="bg-white rounded-xl shadow-md p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                          <Image
                            src={getAvatarUrl(user.avatar)}
                            alt={user.name}
                            width={40}
                            height={40}
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <Globe className="w-3 h-3" />
                          </div>
                        </div>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                          <MoreHorizontal className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                      
                      <p className="text-gray-800 mb-3 whitespace-pre-wrap">{post.content}</p>
                      
                      {post.image && (
                        <div className="rounded-lg overflow-hidden mb-3 bg-gray-100">
                          <Image
                            src={post.image}
                            alt="Post"
                            width={600}
                            height={400}
                            className="w-full"
                            unoptimized
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between py-2 border-t border-b text-sm text-gray-600">
                        <button className="hover:underline">
                          {post.likes} {post.likes === 1 ? 'Like' : 'Likes'}
                        </button>
                        <button className="hover:underline">
                          {post.comments} {post.comments === 1 ? 'Comment' : 'Comments'}
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-1 pt-2">
                        <button className="flex items-center justify-center gap-2 flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">
                          <ThumbsUp className="w-5 h-5" />
                          <span>Like</span>
                        </button>
                        <button className="flex items-center justify-center gap-2 flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">
                          <MessageCircle className="w-5 h-5" />
                          <span>Comment</span>
                        </button>
                        <button className="flex items-center justify-center gap-2 flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">
                          <Share2 className="w-5 h-5" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No posts yet</h3>
                    <p className="text-gray-600">
                      {isOwnProfile 
                        ? "Share your first post to get started!" 
                        : `${user.name} hasn't posted anything yet.`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold mb-6">About</h2>
                
                <div className="space-y-6">
                  {/* Overview */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-gray-900">Overview</h3>
                    <div className="space-y-3">
                      {user.work && (
                        <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                          <Briefcase className="w-5 h-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-gray-600 text-sm">Works at</p>
                            <p className="font-medium text-gray-900">{user.work}</p>
                          </div>
                        </div>
                      )}
                      {user.education && (
                        <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                          <GraduationCap className="w-5 h-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-gray-600 text-sm">Studied at</p>
                            <p className="font-medium text-gray-900">{user.education}</p>
                          </div>
                        </div>
                      )}
                      {user.location && (
                        <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                          <Home className="w-5 h-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-gray-600 text-sm">Lives in</p>
                            <p className="font-medium text-gray-900">{user.location}</p>
                          </div>
                        </div>
                      )}
                      {user.country && (
                        <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-gray-600 text-sm">From</p>
                            <p className="font-medium text-gray-900">{user.country}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold text-lg mb-3 text-gray-900">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                        <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-gray-600 text-sm">Email</p>
                          <p className="font-medium text-gray-900">{user.email}</p>
                        </div>
                      </div>
                      {user.website && (
                        <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                          <LinkIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-gray-600 text-sm">Website</p>
                            <a href={user.website} target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 hover:underline">
                              {user.website}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'friends' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Friends</h2>
                    <p className="text-gray-600">{friends.length} friends</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Search friends..."
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                {friends.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {friends.map((friend) => (
                      <div 
                        key={friend.id} 
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-gray-200"
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          <Image
                            src={getAvatarUrl(friend.avatar)}
                            alt={friend.name}
                            width={64}
                            height={64}
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{friend.name}</h3>
                          <p className="text-sm text-gray-500">Friend</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No friends yet</h3>
                    <p className="text-gray-600">
                      {isOwnProfile 
                        ? "Start connecting with people!" 
                        : `${user.name} hasn't added any friends yet.`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold mb-6">Photos</h2>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                    <div 
                      key={i} 
                      className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <div className="w-full h-full flex items-center justify-center text-purple-400">
                        <ImageIcon className="w-12 h-12" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
