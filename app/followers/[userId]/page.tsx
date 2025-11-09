'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Search, X } from 'lucide-react';
import Image from 'next/image';

interface Follower {
  id: number;
  username: string;
  name: string;
  avatar?: string;
  isFollowing: boolean;
  isFollowingYou: boolean;
}

export default function FollowersPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [filteredFollowers, setFilteredFollowers] = useState<Follower[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetchFollowers();
  }, [userId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = followers.filter(
        (follower) =>
          follower.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          follower.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFollowers(filtered);
    } else {
      setFilteredFollowers(followers);
    }
  }, [searchQuery, followers]);

  const fetchFollowers = async () => {
    try {
      setIsLoading(true);
      
      // Get user info
      const userResponse = await fetch(`/api/users/${userId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUsername(userData.user.username);
      }

      // Get followers
      const response = await fetch(`/api/follow/followers/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFollowers(data.followers || []);
        setFilteredFollowers(data.followers || []);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (followerId: number) => {
    try {
      const response = await fetch(`/api/follow/${followerId}`, { method: 'POST' });
      if (response.ok) {
        setFollowers(
          followers.map((f) =>
            f.id === followerId ? { ...f, isFollowing: true } : f
          )
        );
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (followerId: number) => {
    try {
      const response = await fetch(`/api/follow/${followerId}`, { method: 'DELETE' });
      if (response.ok) {
        setFollowers(
          followers.map((f) =>
            f.id === followerId ? { ...f, isFollowing: false } : f
          )
        );
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const handleRemoveFollower = async (followerId: number) => {
    if (!confirm('Remove this follower?')) return;
    
    try {
      const response = await fetch(`/api/follow/remove-follower/${followerId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setFollowers(followers.filter((f) => f.id !== followerId));
      }
    } catch (error) {
      console.error('Error removing follower:', error);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="w-full px-4">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-base font-semibold">{username}</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className="flex-1 py-3 text-sm font-semibold border-b-2 border-gray-900"
        >
          {followers.length} Followers
        </button>
        <button
          onClick={() => router.push(`/following/${userId}`)}
          className="flex-1 py-3 text-sm text-gray-400 border-b-2 border-transparent"
        >
          Following
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full pl-10 pr-10 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Followers List */}
      <div className="divide-y divide-gray-200">
        {filteredFollowers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-600 text-sm">
              {searchQuery ? 'No users found' : 'No followers yet'}
            </p>
          </div>
        ) : (
          filteredFollowers.map((follower) => (
            <div key={follower.id} className="px-4 py-3 flex items-center justify-between">
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => router.push(`/user-profile/${follower.id}`)}
              >
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {follower.avatar ? (
                    <Image
                      src={getAvatarUrl(follower.avatar)}
                      alt={follower.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                      {follower.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{follower.username}</div>
                  <div className="text-xs text-gray-600 truncate">{follower.name}</div>
                  {follower.isFollowingYou && (
                    <div className="text-xs text-gray-500">Follows you</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-3">
                {follower.isFollowing ? (
                  <button
                    onClick={() => handleUnfollow(follower.id)}
                    className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Following
                  </button>
                ) : (
                  <button
                    onClick={() => handleFollow(follower.id)}
                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Follow
                  </button>
                )}
                <button
                  onClick={() => handleRemoveFollower(follower.id)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
