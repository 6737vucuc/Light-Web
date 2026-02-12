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
  MessageSquare
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
      <div className="min-h-screen bg-[#fcfaff] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="text-purple-600 w-8 h-8" />
          </div>
        </div>
        <p className="mt-6 text-purple-900 font-black text-xl animate-pulse tracking-tight">Light Web Community</p>
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

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      {/* Modern Header */}
      <div className="relative bg-gray-900 pt-32 pb-48 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-purple-600 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-blue-600 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-purple-300 text-xs font-black uppercase tracking-[0.2em] mb-8 border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles size={14} />
            {t('title')}
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            {t('welcome')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Light Web</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            {t('joinGroups')}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative group animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[2rem] blur-xl opacity-20 group-focus-within:opacity-40 transition-opacity"></div>
            <div className="relative flex items-center bg-white rounded-[2rem] p-2 shadow-2xl border border-white/10">
              <div className="pl-6 pr-4 text-gray-400">
                <Search size={24} />
              </div>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchGroups')}
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 font-bold placeholder:text-gray-400 py-4"
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#fafafa] to-transparent"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-24 relative z-20">
        {/* Quick Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-purple-100/20 border border-white flex items-center gap-6 group hover:scale-[1.02] transition-all">
            <div className="w-16 h-16 bg-purple-100 rounded-3xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-purple-50">
              <Zap size={28} />
            </div>
            <div>
              <h4 className="font-black text-gray-900 uppercase tracking-wider text-xs mb-1">Realtime</h4>
              <p className="text-gray-500 text-sm font-bold">Supabase Powered</p>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-blue-100/20 border border-white flex items-center gap-6 group hover:scale-[1.02] transition-all">
            <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-blue-50">
              <Shield size={28} />
            </div>
            <div>
              <h4 className="font-black text-gray-900 uppercase tracking-wider text-xs mb-1">Privacy</h4>
              <p className="text-gray-500 text-sm font-bold">{t('messagesDeleted')}</p>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100/20 border border-white flex items-center gap-6 group hover:scale-[1.02] transition-all">
            <div className="w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-indigo-50">
              <MessageSquare size={28} />
            </div>
            <div>
              <h4 className="font-black text-gray-900 uppercase tracking-wider text-xs mb-1">Encrypted</h4>
              <p className="text-gray-500 text-sm font-bold">Secure Conversations</p>
            </div>
          </div>
        </div>

        {/* Groups Grid */}
        <div className="space-y-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t('groupChat')}</h2>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{groups.length} Groups Available</p>
              </div>
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="bg-white rounded-[3rem] p-20 text-center shadow-xl shadow-gray-100 border border-gray-50">
              <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-gray-300">
                <Users size={48} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4">{t('noGroups')}</h3>
              <p className="text-gray-400 font-medium max-w-xs mx-auto">{t('groupsComingSoon')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredGroups.map((group) => (
                <GroupCard 
                  key={group.id} 
                  group={group} 
                  currentUser={currentUser}
                  onOpenChat={setSelectedGroup} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
