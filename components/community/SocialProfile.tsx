'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Briefcase, GraduationCap, Heart, Link as LinkIcon, Calendar, Users, Image as ImageIcon, Settings, UserPlus, MessageCircle, MoreHorizontal, Edit } from 'lucide-react';
import Image from 'next/image';

interface SocialProfileProps {
  userId?: number;
  currentUser: any;
  onClose?: () => void;
}

interface ProfileData {
  id: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  coverPhoto: string | null;
  bio: string | null;
  location: string | null;
  work: string | null;
  education: string | null;
  website: string | null;
  relationshipStatus: string | null;
  birthDate: string | null;
  createdAt: string;
  friendsCount: number;
  postsCount: number;
  photosCount: number;
  isFriend: boolean;
  friendRequestSent: boolean;
}

export default function SocialProfile({ userId, currentUser, onClose }: SocialProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'about' | 'friends' | 'photos'>('timeline');
  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const profileUserId = userId || currentUser?.id;
  const isOwnProfile = profileUserId === currentUser?.id;

  useEffect(() => {
    if (profileUserId) {
      fetchProfile();
    }
  }, [profileUserId]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${profileUserId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: profileUserId }),
      });

      if (response.ok) {
        fetchProfile();
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
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

        fetchProfile();
      }
    } catch (error) {
      console.error('Error uploading cover photo:', error);
    }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-900">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Cover Photo */}
      <div className="relative h-80 bg-gradient-to-r from-purple-400 to-blue-400">
        {profile.coverPhoto ? (
          <Image
            src={getAvatarUrl(profile.coverPhoto)}
            alt="Cover"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500"></div>
        )}
        
        {isOwnProfile && (
          <>
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Edit Cover Photo
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverPhotoChange}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Profile Header */}
      <div className="relative px-8 pb-6">
        {/* Avatar */}
        <div className="relative -mt-20 mb-4">
          <div className="relative w-40 h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100">
            {profile.avatar ? (
              <Image
                src={getAvatarUrl(profile.avatar)}
                alt={profile.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-5xl">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          {isOwnProfile && (
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
            >
              <Camera className="w-5 h-5 text-gray-700" />
            </button>
          )}
        </div>

        {/* Name and Bio */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h1>
            {profile.bio && (
              <p className="text-gray-600 mb-3">{profile.bio}</p>
            )}
            
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <strong>{profile.friendsCount}</strong> friends
              </span>
              <span className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                <strong>{profile.photosCount}</strong> photos
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={() => setShowPrivacySettings(true)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </>
            ) : (
              <>
                {profile.isFriend ? (
                  <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Friends
                  </button>
                ) : profile.friendRequestSent ? (
                  <button className="px-4 py-2 bg-gray-100 rounded-lg flex items-center gap-2 cursor-not-allowed">
                    <UserPlus className="w-4 h-4" />
                    Request Sent
                  </button>
                ) : (
                  <button
                    onClick={handleAddFriend}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Friend
                  </button>
                )}
                
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Message
                </button>
                
                <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mt-6">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'timeline'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'about'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'friends'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Friends
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'photos'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Photos
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-8 py-6">
        {activeTab === 'about' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
            
            {profile.work && (
              <div className="flex items-center gap-3 text-gray-700">
                <Briefcase className="w-5 h-5 text-gray-900" />
                <span>Works at <strong>{profile.work}</strong></span>
              </div>
            )}
            
            {profile.education && (
              <div className="flex items-center gap-3 text-gray-700">
                <GraduationCap className="w-5 h-5 text-gray-900" />
                <span>Studied at <strong>{profile.education}</strong></span>
              </div>
            )}
            
            {profile.location && (
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-5 h-5 text-gray-900" />
                <span>Lives in <strong>{profile.location}</strong></span>
              </div>
            )}
            
            {profile.relationshipStatus && (
              <div className="flex items-center gap-3 text-gray-700">
                <Heart className="w-5 h-5 text-gray-900" />
                <span className="capitalize">{profile.relationshipStatus}</span>
              </div>
            )}
            
            {profile.website && (
              <div className="flex items-center gap-3 text-gray-700">
                <LinkIcon className="w-5 h-5 text-gray-900" />
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {profile.website}
                </a>
              </div>
            )}
            
            {profile.birthDate && (
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-gray-900" />
                <span>Born on {new Date(profile.birthDate).toLocaleDateString()}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="w-5 h-5 text-gray-900" />
              <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="text-center py-12 text-gray-900">
            <p>Posts will appear here</p>
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="text-center py-12 text-gray-900">
            <p>Friends list will appear here</p>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="text-center py-12 text-gray-900">
            <p>Photos will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
