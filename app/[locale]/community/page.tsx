'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, MessageCircle, Home, User } from 'lucide-react';
import Image from 'next/image';
import EnhancedGroupChat from '@/components/community/EnhancedGroupChat';
import { useTranslations } from 'next-intl';

export default function CommunityPage() {
  const t = useTranslations('community');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadGroups();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Restore selected group from localStorage after groups are loaded
    if (groups.length > 0 && !selectedGroup) {
      const savedGroupId = localStorage.getItem('selectedGroupId');
      if (savedGroupId) {
        const groupId = parseInt(savedGroupId);
        const fullGroup = groups.find(g => g.id === groupId);
        if (fullGroup) {
          setSelectedGroup(fullGroup);
        } else {
          localStorage.removeItem('selectedGroupId');
        }
      }
    }
  }, [groups, selectedGroup]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
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

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pb-16 md:pb-0">
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {t('title')}
                </h1>
                <p className="text-xs text-gray-500">{t('groupChat')}</p>
              </div>
            </div>

            {/* User Avatar */}
            <button
              onClick={() => router.push('/profile')}
              className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 border-2 border-purple-600 hover:scale-105 transition-transform"
            >
              {currentUser?.avatar ? (
                <Image
                  src={getAvatarUrl(currentUser.avatar)}
                  alt={currentUser.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-sm font-bold">
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {selectedGroup ? (
          /* Group Chat View */
          <EnhancedGroupChat
            group={selectedGroup}
            currentUser={currentUser}
            onBack={() => {
              setSelectedGroup(null);
              localStorage.removeItem('selectedGroupId');
            }}
          />
        ) : (
          /* Groups List */
          <div>
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
              <h2 className="text-2xl font-bold mb-2">{t('welcome')} {currentUser?.name}! 👋</h2>
              <p className="text-purple-100">
                {t('joinGroups')}
              </p>
              <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-3 text-sm">
                <p className="flex items-center gap-2">
                  <span className="text-yellow-300">⚠️</span>
                  {t('messagesDeleted')}
                </p>
              </div>
            </div>

            {/* Groups Grid */}
            {groups.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('noGroups')}</h3>
                <p className="text-gray-500">{t('groupsComingSoon')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={async () => {
                      // Join the group first
                      try {
                        const response = await fetch(`/api/groups/${group.id}/join`, {
                          method: 'POST',
                        });
                        if (response.ok) {
                          setSelectedGroup(group);
                          // Save to localStorage
                          localStorage.setItem('selectedGroupId', group.id.toString());
                        }
                      } catch (error) {
                        console.error('Error joining group:', error);
                      }
                    }}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
                  >
                    {/* Group Header with Color */}
                    <div
                      className="h-32 flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${group.color} 0%, ${group.color}dd 100%)`,
                      }}
                    >
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all"></div>
                      <Users className="w-16 h-16 text-white relative z-10 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Group Info */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 text-start">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-gray-600 text-sm mb-4 text-start line-clamp-2">
                          {group.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Users className="w-4 h-4" />
                          <span>{group.members_count || 0} {t('members')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <MessageCircle className="w-4 h-4" />
                          <span>{group.messages_count || 0} {t('messages')}</span>
                        </div>
                      </div>

                      {/* Join Button */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-center gap-2 text-purple-600 font-medium group-hover:text-pink-600 transition-colors">
                          <MessageCircle className="w-5 h-5" />
                          <span>{t('openChat')}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 z-40 shadow-lg">
        <div className="flex items-center justify-around h-16">
          <button
            onClick={() => router.push('/community')}
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <Home className="w-6 h-6 text-purple-600" strokeWidth={2} />
            <span className="text-xs text-purple-600 font-medium mt-1">{tCommon('community')}</span>
          </button>

          <button
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <User className="w-6 h-6 text-gray-600" strokeWidth={2} />
            <span className="text-xs text-gray-600 mt-1">{tCommon('profile')}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
