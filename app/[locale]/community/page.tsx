'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, MessageCircle, Home, User, Sparkles, BookOpen, Heart, Shield, ArrowLeft, Loader2, Info, Search, Filter } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Image from 'next/image';
import EnhancedGroupChat from '@/components/community/EnhancedGroupChat';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';

export default function CommunityPage() {
  const toast = useToast();
  const t = useTranslations('community');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

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
      const response = await fetch(`/api/groups?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
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

  const DynamicIcon = ({ name, className, size = 24 }: { name: string, className?: string, size?: number }) => {
    const IconComponent = (LucideIcons as any)[name] || LucideIcons.Users;
    return <IconComponent className={className} size={size} />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-purple-600 w-12 h-12 mb-4" />
        <p className="text-gray-500 font-bold animate-pulse">Entering Community...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${selectedGroup ? 'h-screen overflow-hidden' : 'pb-20 md:pb-0'}`}>
      {/* Dynamic Header based on selection */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${selectedGroup ? 'bg-white shadow-md' : 'bg-gradient-to-r from-purple-700 via-purple-600 to-blue-600 shadow-lg py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {selectedGroup ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setSelectedGroup(null);
                    localStorage.removeItem('selectedGroupId');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                >
                  <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0" style={{ backgroundColor: selectedGroup.color }}>
                    <DynamicIcon name={selectedGroup.icon} size={20} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-black text-gray-900 leading-none truncate">{selectedGroup.name}</h1>
                    <div className="h-4 flex items-center mt-1">
                      {typingUsers.length > 0 ? (
                        <p className="text-[11px] text-emerald-600 font-black animate-pulse truncate">
                          {typingUsers.length === 1 
                            ? `${typingUsers[0].name} is typing...`
                            : `${typingUsers.length} people are typing...`}
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          {onlineCount || selectedGroup.members_count || 0} Online
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight">{t('title')}</h1>
                  <p className="text-purple-100 text-xs font-medium opacity-90">{t('groupChat')}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {selectedGroup && (
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to leave this group?')) {
                      fetch(`/api/groups/${selectedGroup.id}/leave`, { method: 'POST' })
                        .then(res => {
                          if (res.ok) {
                            setSelectedGroup(null);
                            localStorage.removeItem('selectedGroupId');
                            loadGroups();
                          }
                        });
                    }
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Leave Group"
                >
                  <LogOut size={20} />
                </button>
              )}
              {!selectedGroup && (
                <button onClick={() => router.push('/')} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white hidden md:flex">
                  <Home size={20} />
                </button>
              )}
              <button
                onClick={() => router.push('/profile?from=community')}
                className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${selectedGroup ? 'border-purple-600 shadow-lg shadow-purple-100' : 'border-white/30 shadow-xl'}`}
              >
                {currentUser?.avatar ? (
                  <Image src={getAvatarUrl(currentUser.avatar)} alt={currentUser.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-sm font-black">
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto ${selectedGroup ? 'p-0 h-[calc(100vh-64px)]' : 'px-4 sm:px-6 lg:px-8 py-8'}`}>
        {selectedGroup ? (
          <div className="bg-white md:rounded-3xl shadow-2xl border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
            <EnhancedGroupChat
              group={selectedGroup}
              currentUser={currentUser}
              onBack={() => {
                setSelectedGroup(null);
                localStorage.removeItem('selectedGroupId');
              }}
              onTypingChange={setTypingUsers}
              onOnlineChange={setOnlineCount}
            />
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* Redesigned Welcome Banner */}
            <div className="relative bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-purple-100/50 border border-gray-100 overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-purple-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
              <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="p-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-[2rem] shadow-2xl shadow-purple-200 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <Sparkles className="w-12 h-12 text-white animate-pulse" />
                </div>
                <div className="text-center md:text-start flex-1">
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight">
                    {t('welcome')} {currentUser?.name?.split(' ')[0]}!
                  </h2>
                  <p className="text-gray-500 text-lg font-medium max-w-2xl leading-relaxed">
                    {t('joinGroups')}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                    <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-100">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      Live Discussions
                    </span>
                    <span className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-xs font-black uppercase tracking-wider border border-purple-100">
                      <Shield size={14}/>
                      Safe Community
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Alert Info */}
              <div className="mt-10 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3 relative z-10">
                <div className="p-2 bg-yellow-100 rounded-xl text-yellow-600"><Info size={20}/></div>
                <p className="text-sm text-gray-600 font-bold leading-relaxed">
                  <span className="text-yellow-700">Notice:</span> {t('messagesDeleted')}
                </p>
              </div>
            </div>

            {/* Section Header */}
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Active Circles</h3>
                <p className="text-gray-500 font-bold text-sm">Join a group to start sharing</p>
              </div>
              <div className="flex gap-2">
                <div className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400"><Filter size={20}/></div>
                <div className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400"><Search size={20}/></div>
              </div>
            </div>

            {/* Redesigned Groups Grid */}
            {groups.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-gray-100">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-12 h-12 text-gray-300" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">{t('noGroups')}</h3>
                <p className="text-gray-500 font-bold max-w-xs mx-auto leading-relaxed">{t('groupsComingSoon')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const response = await fetch(`/api/groups/${group.id}/join`, { method: 'POST' });
                        if (response.ok) {
                          setSelectedGroup(group);
                          localStorage.setItem('selectedGroupId', group.id.toString());
                        } else {
                          const data = await response.json();
                          toast.error(data.error || 'Failed to join group');
                        }
                      } catch (error) {
                        console.error('Error joining group:', error);
                        toast.error('Connection error');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="group bg-white rounded-[2rem] shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden flex flex-col text-start"
                  >
                    {/* Modern Group Header */}
                    <div className="h-40 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: group.color }}>
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent opacity-60"></div>
                      <div className="relative z-10 p-6 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <DynamicIcon name={group.icon} className="w-12 h-12 text-white" size={48} />
                      </div>
                      <div className="absolute bottom-4 left-6 z-10">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-black uppercase text-gray-900 shadow-sm">
                          {group.members_count || 0} Members
                        </span>
                      </div>
                    </div>

                    {/* Modern Group Content */}
                    <div className="p-8 flex-1 flex flex-col">
                      <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
                        {group.name}
                      </h3>
                      <p className="text-gray-500 text-sm font-medium mb-8 line-clamp-2 leading-relaxed flex-1">
                        {group.description || 'Join this circle to connect with others and share your spiritual journey.'}
                      </p>

                      <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-400">
                          <MessageCircle size={18} />
                          <span className="text-sm font-black tracking-tight">{group.messages_count || 0} Chats</span>
                        </div>
                        <div className="px-6 py-3 bg-purple-50 text-purple-700 rounded-2xl font-black text-sm group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-xl group-hover:shadow-purple-100">
                          {t('openChat')}
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

      {/* Enhanced Modern Bottom Navigation */}
      {!selectedGroup && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          {/* Gradient Background Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/5 via-transparent to-transparent pointer-events-none h-32 -top-32"></div>
          
          {/* Main Navigation Container */}
          <div className="relative mx-4 mb-6 bg-white/95 backdrop-blur-2xl border border-gray-200/50 shadow-2xl shadow-purple-500/10 rounded-[2rem] overflow-visible">
            <div className="flex items-center justify-around h-20 px-2 relative">
              {/* Lessons Button */}
              <button 
                onClick={() => router.push('/lessons')} 
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 group transition-all duration-300 active:scale-95"
              >
                <div className="p-2.5 rounded-2xl transition-all duration-300 group-hover:bg-purple-50">
                  <BookOpen size={22} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <span className="text-[9px] font-bold text-gray-400 group-hover:text-purple-600 transition-colors uppercase tracking-wider">
                  Lessons
                </span>
              </button>

              {/* Community Button (Active) */}
              <button 
                onClick={() => router.push('/community')} 
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 relative transition-all duration-300 active:scale-95"
              >
                <div className="p-2.5 bg-purple-100 rounded-2xl shadow-lg shadow-purple-200/50 transition-all duration-300">
                  <Users size={22} className="text-purple-600" />
                </div>
                <span className="text-[9px] font-black text-purple-600 uppercase tracking-wider">
                  {tCommon('community')}
                </span>
                {/* Active Indicator */}
                <div className="absolute -bottom-0.5 w-10 h-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-full shadow-lg"></div>
              </button>

              {/* Floating Home Button */}
              <div className="flex-1 flex items-center justify-center">
                <button 
                  onClick={() => router.push('/')} 
                  className="absolute -top-8 w-16 h-16 bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 rounded-[1.2rem] shadow-2xl shadow-purple-500/40 flex items-center justify-center transform transition-all duration-300 hover:scale-110 hover:rotate-6 active:scale-95 border-4 border-white group"
                >
                  <Home size={28} className="text-white group-hover:scale-110 transition-transform" />
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[1rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>

              {/* Support Button */}
              <button 
                onClick={() => router.push('/support')} 
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 group transition-all duration-300 active:scale-95"
              >
                <div className="p-2.5 rounded-2xl transition-all duration-300 group-hover:bg-purple-50">
                  <Heart size={22} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <span className="text-[9px] font-bold text-gray-400 group-hover:text-purple-600 transition-colors uppercase tracking-wider">
                  Support
                </span>
              </button>

              {/* Profile Button */}
              <button 
                onClick={() => router.push('/profile?from=community')} 
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 group transition-all duration-300 active:scale-95"
              >
                <div className="p-2.5 rounded-2xl transition-all duration-300 group-hover:bg-purple-50">
                  <User size={22} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <span className="text-[9px] font-bold text-gray-400 group-hover:text-purple-600 transition-colors uppercase tracking-wider">
                  Profile
                </span>
              </button>
            </div>

            {/* Bottom Safe Area for iOS */}
            <div className="h-2 bg-transparent"></div>
          </div>
        </nav>
      )}
    </div>
  );
                  }
