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
  Info, 
  LogOut,
  ChevronRight,
  MessageCircle,
  TrendingUp,
  Globe
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

  const DynamicIcon = ({ name, className, size = 24 }: { name: string, className?: string, size?: number }) => {
    const IconComponent = (LucideIcons as any)[name] || LucideIcons.Users;
    return <IconComponent className={className} size={size} />;
  };

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

  return (
    <div className={`min-h-screen bg-[#fcfaff] ${selectedGroup ? 'h-screen overflow-hidden' : 'pb-10'}`}>
      {/* Dynamic Header */}
      <header className={`sticky top-0 z-50 transition-all duration-500 ${
        selectedGroup 
          ? 'bg-white/80 backdrop-blur-xl border-b border-gray-100 py-3' 
          : 'bg-gradient-to-br from-purple-700 via-indigo-600 to-blue-600 py-8 shadow-2xl shadow-purple-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {selectedGroup ? (
              <div className="flex items-center gap-4 flex-1">
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all text-gray-600 active:scale-90"
                >
                  <ArrowLeft size={22} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current/20 transform rotate-3" style={{ backgroundColor: selectedGroup.color }}>
                    <DynamicIcon name={selectedGroup.icon} size={24} />
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-gray-900 leading-none">{selectedGroup.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      {typingUsers.length > 0 ? (
                        <p className="text-[11px] text-emerald-600 font-black animate-pulse">
                          {typingUsers.length === 1 ? `${typingUsers[0].name} يكتب...` : 'عدة أشخاص يكتبون...'}
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          {selectedGroup.members_count || 0} عضو متصل
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/20 shadow-xl">
                  <Globe className="w-8 h-8 text-white animate-[spin_10s_linear_infinite]" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">المجتمع الذكي</h1>
                  <p className="text-purple-100 text-sm font-bold opacity-80 flex items-center gap-2">
                    <TrendingUp size={14} />
                    تواصل، شارك، وارتقِ
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              {!selectedGroup && (
                <button onClick={() => router.push('/')} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white active:scale-90">
                  <Home size={22} />
                </button>
              )}
              <button
                onClick={() => router.push('/profile?from=community')}
                className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                  selectedGroup ? 'border-purple-600 shadow-lg shadow-purple-100' : 'border-white/30 shadow-2xl'
                }`}
              >
                {currentUser?.avatar ? (
                  <Image src={currentUser.avatar} alt={currentUser.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-lg font-black">
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto ${selectedGroup ? 'p-0 h-[calc(100vh-80px)]' : 'px-4 sm:px-6 lg:px-8 py-10'}`}>
        {selectedGroup ? (
          <div className="bg-white md:rounded-t-[3rem] shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.1)] overflow-hidden h-full animate-in slide-in-from-bottom-10 duration-700">
            <EnhancedGroupChat
              group={selectedGroup}
              currentUser={currentUser}
              onBack={() => setSelectedGroup(null)}
              onTypingChange={setTypingUsers}
              onOnlineChange={setOnlineCount}
            />
          </div>
        ) : (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="relative bg-white rounded-[3rem] p-8 md:p-16 shadow-[0_30px_60px_-15px_rgba(124,58,237,0.15)] border border-purple-50 overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-purple-100/40 rounded-full blur-[100px] group-hover:bg-purple-200/50 transition-colors duration-700"></div>
              <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-blue-100/40 rounded-full blur-[100px] group-hover:bg-blue-200/50 transition-colors duration-700"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="relative">
                  <div className="p-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-[2.5rem] shadow-2xl shadow-purple-200 transform -rotate-6 group-hover:rotate-0 transition-all duration-700">
                    <Sparkles className="w-16 h-16 text-white animate-pulse" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-purple-600 animate-bounce">
                    <MessageCircle size={24} />
                  </div>
                </div>
                <div className="text-center md:text-start flex-1">
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-5 tracking-tight leading-tight">
                    أهلاً بك، {currentUser?.name?.split(' ')[0]}! 👋
                  </h2>
                  <p className="text-gray-500 text-xl font-medium max-w-2xl leading-relaxed">
                    استكشف مجموعاتنا المميزة وشارك في حوارات حية ومفيدة مع مجتمعنا المتنامي.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
                    <span className="flex items-center gap-2.5 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      نقاشات مباشرة
                    </span>
                    <span className="flex items-center gap-2.5 px-6 py-3 bg-purple-50 text-purple-700 rounded-2xl text-xs font-black uppercase tracking-widest border border-purple-100 shadow-sm">
                      <Shield size={16}/>
                      بيئة آمنة
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Groups Grid */}
            <div className="space-y-8">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                  المجموعات النشطة
                  <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">{groups.length}</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {groups.map((group, idx) => (
                  <div key={group.id} className="animate-in fade-in slide-in-from-bottom-5" style={{ animationDelay: `${idx * 100}ms` }}>
                    <GroupCard group={group} onSelect={setSelectedGroup} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
