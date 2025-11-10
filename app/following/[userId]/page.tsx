'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Search, X } from 'lucide-react';
import Image from 'next/image';
import Pusher from 'pusher-js';

interface Following {
  id: number;
  username: string;
  name: string;
  avatar?: string;
  isFollowingYou: boolean;
  lastSeen?: string;
}

export default function FollowingPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  
  const [following, setFollowing] = useState<Following[]>([]);
  const [filteredFollowing, setFilteredFollowing] = useState<Following[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const pusherRef = useRef<Pusher | null>(null);

  useEffect(() => {
    fetchFollowing();
    setupPusher();
    
    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [userId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = following.filter(
        (user) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFollowing(filtered);
    } else {
      setFilteredFollowing(following);
    }
  }, [searchQuery, following]);

  const setupPusher = () => {
    if (typeof window === 'undefined') return;
    
    pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    });

    const channel = pusherRef.current.subscribe(`user-${userId}`);
    
    channel.bind('following-added', (data: any) => {
      fetchFollowing();
    });
    
    channel.bind('following-removed', (data: any) => {
      setFollowing((prev) => prev.filter((f) => f.id !== data.followingId));
    });
    
    channel.bind('user-status', (data: { userId: number; isOnline: boolean; lastSeen?: string }) => {
      setFollowing((prev) =>
        prev.map((f) =>
          f.id === data.userId
            ? { ...f, isOnline: data.isOnline, lastSeen: data.lastSeen }
            : f
        )
      );
    });
  };

  const fetchFollowing = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const meResponse = await fetch('/api/auth/me');
      if (meResponse.ok) {
        const meData = await meResponse.json();
        setCurrentUserId(meData.user?.id);
      }
      
      // Get user info
      const userResponse = await fetch(`/api/users/${userId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUsername(userData.user.username);
      }

      // Get following
      const response = await fetch(`/api/follow/following/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFollowing(data.following || []);
        setFilteredFollowing(data.following || []);
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async (followingId: number) => {
    if (!confirm('Unfollow this user?')) return;
    
    try {
      const response = await fetch(`/api/follow/${followingId}`, { method: 'DELETE' });
      if (response.ok) {
        setFollowing(following.filter((f) => f.id !== followingId));
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

  const isOwnProfile = currentUserId === parseInt(userId);

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
          onClick={() => router.push(`/followers/${userId}`)}
          className="flex-1 py-3 text-sm text-gray-400 border-b-2 border-transparent"
        >
          Followers
        </button>
        <button
          className="flex-1 py-3 text-sm font-semibold border-b-2 border-gray-900"
        >
          {following.length} Following
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

      {/* Following List */}
      <div className="divide-y divide-gray-200">
        {filteredFollowing.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-600 text-sm">
              {searchQuery ? 'No users found' : 'Not following anyone yet'}
            </p>
          </div>
        ) : (
          filteredFollowing.map((user) => (
            <div key={user.id} className="px-4 py-3 flex items-center justify-between">
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => router.push(`/user-profile/${user.id}`)}
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
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{user.username}</div>
                  <div className="text-xs text-gray-600 truncate">{user.name}</div>
                  {user.isFollowingYou && (
                    <div className="text-xs text-gray-500">Follows you</div>
                  )}
                </div>
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => handleUnfollow(user.id)}
                  className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold transition-colors ml-3"
                >
                  Following
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
