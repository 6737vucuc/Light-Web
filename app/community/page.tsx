'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Users, Search, Plus } from 'lucide-react';
import GroupChat from '@/components/community/GroupChat';
import PublicFeed from '@/components/community/PublicFeed';
import SecurityLoading from '@/components/SecurityLoading';
import MessageNotifications from '@/components/community/MessageNotifications';

export default function CommunityPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'chat' | 'feed'>('feed');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          setIsAuthenticated(true);
          // Update lastSeen to show online status
          fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
          // Simulate security initialization
          setTimeout(() => {
            setIsLoading(false);
          }, 3000);
        } else {
          // Not authenticated, redirect to login
          router.push('/auth/login?redirect=/community');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/auth/login?redirect=/community');
      }
    };

    checkAuth();
    
    // Update lastSeen every 30 seconds to maintain online status
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [router, isAuthenticated]);

  if (isLoading) {
    return <SecurityLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo and Icons */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Light of Life
            </h1>

            {/* Icons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/community')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-6 h-6 text-gray-700" />
              </button>
              <button
                onClick={() => router.push('/community')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Search className="w-6 h-6 text-gray-700" />
              </button>
              <MessageNotifications />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center px-6 py-2 rounded-md transition-colors ${
                activeTab === 'feed'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-5 w-5 mr-2" />
              Public Feed
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center px-6 py-2 rounded-md transition-colors ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Group Chat
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto">
          {activeTab === 'feed' ? (
            <PublicFeed />
          ) : (
            <div className="max-w-4xl mx-auto"><GroupChat /></div>
          )}
        </div>
      </div>
    </div>
  );
}
