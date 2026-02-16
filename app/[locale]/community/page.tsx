'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Users, 
  Home, 
  Sparkles, 
  Shield, 
  ArrowLeft, 
  Loader2, 
  MessageCircle,
  TrendingUp,
  Globe,
  Search,
  Zap,
  MessageSquare,
  Heart,
  Flame,
  Star,
  Lightbulb
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Image from 'next/image';
import EnhancedGroupChat from '@/components/community/EnhancedGroupChat';
import GroupCard from '@/components/community/GroupCard';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';

export default function CommunityPage() {
  const toast = useToast();
  const t = useTranslations('community');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadGroups();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user || data);
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

  const DynamicIcon = ({ name, className, size = 24 }: { name: string, className?: string, size?: number }) => {
    const iconName = typeof name === 'string' && name ? name : 'Users';
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Users;
    return <IconComponent className={className} size={size} />;
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fcfaff] via-white to-[#f5f3ff] flex flex-col items-center justify-center px-4">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="text-purple-600 w-8 h-8" />
          </div>
        </div>
        <p className="mt-6 text-purple-900 font-black text-lg md:text-xl animate-pulse tracking-tight text-center">Light Web Community</p>
      </div>
    );
  }

  if (selectedGroup) {
    return (
      <div className="h-screen bg-white">
        <EnhancedGroupChat 
          group={selectedGroup} 
          currentUser={currentUser} 
          onBack={() => setSelectedGroup(null)} 
        />
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 18) return '☀️';
    return '🌙';
  };

  const currentId = currentUser ? (currentUser.userId || currentUser.id) : null;
  const userName = currentUser?.name?.split(' ')[0] || 'Friend';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcfaff] via-white to-[#f5f3ff] pb-20">
      {/* Welcome Section */}
      {showWelcome && (
        <div className="relative bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 pt-16 md:pt-24 pb-12 md:pb-16 overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[80%] bg-white rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[80%] bg-white rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            <div className="flex items-start justify-between gap-4 mb-6 md:mb-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
                  <span className="text-3xl md:text-4xl animate-bounce">{getGreetingIcon()}</span>
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-white tracking-tight break-words">
                    {getGreeting()}, <span className="text-yellow-200">{userName}</span>!
                  </h2>
                </div>
                <p className="text-white/80 text-sm md:text-lg font-medium max-w-2xl">
                  {t('welcomeMessage')}
                </p>
              </div>
              <button 
                onClick={() => setShowWelcome(false)}
                className="p-2 text-white/60 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft size={20} className="rotate-180 md:w-6 md:h-6" />
              </button>
            </div>

            {/* Quick Stats - Responsive Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20 hover:bg-white/15 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">{groups.length}</div>
                <p className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-wide">{t('groupsAvailable')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20 hover:bg-white/15 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">∞</div>
                <p className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-wide">{t('connections')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20 hover:bg-white/15 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">24/7</div>
                <p className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-wide">{t('realtime')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20 hover:bg-white/15 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">🔒</div>
                <p className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-wide">{t('secure')}</p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full h-16 md:h-24 bg-gradient-to-t from-[#fcfaff] to-transparent"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-8 md:-mt-12 relative z-20">
        {/* Search Bar */}
        <div className="mb-12 md:mb-16">
          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-[1.5rem] md:rounded-[2rem] blur-xl opacity-20 group-focus-within:opacity-40 transition-opacity"></div>
            <div className="relative flex items-center bg-white rounded-[1.5rem] md:rounded-[2rem] p-2 shadow-2xl border border-purple-100/50 hover:border-purple-200 transition-all">
              <div className="pl-4 md:pl-6 pr-3 md:pr-4 text-purple-400">
                <Search size={20} className="md:w-6 md:h-6" />
              </div>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchGroups')}
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 font-bold placeholder:text-gray-400 py-3 md:py-4 text-sm md:text-base"
              />
            </div>
          </div>
        </div>

        {/* Quick Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16">
          <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-xl shadow-purple-100/20 border border-white/80 group hover:shadow-2xl hover:shadow-purple-200/30 hover:scale-[1.02] transition-all duration-300">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl md:rounded-3xl flex items-center justify-center text-purple-600 group-hover:from-purple-600 group-hover:to-purple-500 group-hover:text-white transition-all duration-500 shadow-lg shadow-purple-100 mb-4">
              <Zap size={24} className="md:w-7 md:h-7" />
            </div>
            <h4 className="font-black text-gray-900 uppercase tracking-wider text-xs mb-2">⚡ Realtime</h4>
            <p className="text-gray-600 text-xs md:text-sm font-medium">Supabase Powered instant messaging</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-xl shadow-blue-100/20 border border-white/80 group hover:shadow-2xl hover:shadow-blue-200/30 hover:scale-[1.02] transition-all duration-300">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl md:rounded-3xl flex items-center justify-center text-blue-600 group-hover:from-blue-600 group-hover:to-blue-500 group-hover:text-white transition-all duration-500 shadow-lg shadow-blue-100 mb-4">
              <Shield size={24} className="md:w-7 md:h-7" />
            </div>
            <h4 className="font-black text-gray-900 uppercase tracking-wider text-xs mb-2">🔒 Privacy</h4>
            <p className="text-gray-600 text-xs md:text-sm font-medium">{t('messagesDeleted')}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-xl shadow-indigo-100/20 border border-white/80 group hover:shadow-2xl hover:shadow-indigo-200/30 hover:scale-[1.02] transition-all duration-300">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-2xl md:rounded-3xl flex items-center justify-center text-indigo-600 group-hover:from-indigo-600 group-hover:to-indigo-500 group-hover:text-white transition-all duration-500 shadow-lg shadow-indigo-100 mb-4">
              <MessageSquare size={24} className="md:w-7 md:h-7" />
            </div>
            <h4 className="font-black text-gray-900 uppercase tracking-wider text-xs mb-2">💬 Encrypted</h4>
            <p className="text-gray-600 text-xs md:text-sm font-medium">Secure conversations for peace of mind</p>
          </div>
        </div>

        {/* Groups Grid */}
        <div className="space-y-8 md:space-y-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-xl shadow-purple-200/50">
                <Users size={24} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">{t('groupChat')}</h2>
                <p className="text-gray-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-1">
                  {filteredGroups.length} {filteredGroups.length === 1 ? 'Group' : 'Groups'} {t('available')}
                </p>
              </div>
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="bg-white rounded-2xl md:rounded-[3rem] p-12 md:p-20 text-center shadow-xl shadow-gray-100/50 border border-gray-100 hover:shadow-2xl transition-all">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-8 text-purple-300 shadow-lg shadow-purple-100/30">
                <Users size={40} className="md:w-12 md:h-12" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-3 md:mb-4">{t('noGroups')}</h3>
              <p className="text-gray-500 font-medium max-w-xs mx-auto text-sm md:text-base">{t('groupsComingSoon')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-500">
              {filteredGroups.map((group, idx) => (
                <div key={group.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                  <GroupCard 
                    group={group} 
                    currentUser={currentUser}
                    onOpenChat={setSelectedGroup} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        {filteredGroups.length > 0 && (
          <div className="mt-16 md:mt-20 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl md:rounded-[3rem] p-8 md:p-12 text-center shadow-2xl shadow-purple-200/50 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-3 md:mb-4">Ready to Connect?</h3>
              <p className="text-white/80 text-sm md:text-lg font-medium max-w-2xl mx-auto mb-6 md:mb-8">
                Join any group above to start conversations and build meaningful connections with the community.
              </p>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-6 md:px-8 py-3 md:py-4 bg-white text-purple-600 rounded-xl md:rounded-2xl font-black uppercase tracking-wider text-sm md:text-base hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg"
              >
                Explore Groups
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
