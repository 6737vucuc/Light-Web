'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Users, MessageCircle, LogIn, LogOut, Loader2, ArrowRight, ChevronRight, Flame, Star } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

interface GroupCardProps {
  group: any;
  currentUser: any;
  onOpenChat: (group: any) => void;
}

export default function GroupCard({ group, currentUser, onOpenChat }: GroupCardProps) {
  const t = useTranslations('community');
  const toast = useToast();
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    checkMembership();
  }, [group.id, currentUser?.id]);

  const checkMembership = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/groups/${group.id}/membership`);
      if (res.ok) {
        const data = await res.json();
        setIsMember(data.isMember);
      }
    } catch (error) {
      console.error('Check membership error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      toast.show('Please sign in to join groups', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/membership`, { method: 'POST' });
      if (res.ok) {
        setIsMember(true);
        toast.show(t('joinedSuccess') || 'Successfully joined!', 'success');
      } else {
        toast.show('Failed to join group', 'error');
      }
    } catch (error) {
      toast.show('An error occurred', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('leaveGroupConfirm') || 'Are you sure you want to leave this group?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/membership`, { method: 'DELETE' });
      if (res.ok) {
        setIsMember(false);
        toast.show(t('leftSuccess') || 'Left group successfully', 'success');
      } else {
        toast.show('Failed to leave group', 'error');
      }
    } catch (error) {
      toast.show('An error occurred', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const DynamicIcon = ({ name, size = 24 }: { name: string; size?: number }) => {
    const iconName = typeof name === 'string' && name ? name : 'Users';
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Users;
    return <IconComponent size={size} />;
  };

  const getGroupColor = (color?: string) => {
    const colorMap: { [key: string]: string } = {
      '#8B5CF6': 'from-purple-600 to-purple-400',
      '#3B82F6': 'from-blue-600 to-blue-400',
      '#EC4899': 'from-pink-600 to-pink-400',
      '#F59E0B': 'from-amber-600 to-amber-400',
      '#10B981': 'from-emerald-600 to-emerald-400',
      '#EF4444': 'from-red-600 to-red-400',
    };
    return colorMap[color || '#8B5CF6'] || 'from-purple-600 to-purple-400';
  };

  return (
    <div
      onClick={() => isMember && onOpenChat(group)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-white rounded-[2.5rem] p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] border border-gray-100 transition-all duration-500 ${
        isMember ? 'cursor-pointer hover:border-purple-200 hover:shadow-[0_30px_60px_-20px_rgba(124,58,237,0.2)]' : 'hover:border-gray-200'
      } overflow-hidden group`}
    >
      {/* Gradient Background Accent */}
      <div
        className={`absolute top-0 right-0 w-48 h-48 opacity-0 group-hover:opacity-[0.05] transition-all duration-500 ${isHovered && isMember ? 'scale-125' : 'scale-100'}`}
        style={{
          backgroundColor: group.color || '#8B5CF6',
          borderRadius: '0 0 0 100%',
        }}
      ></div>

      {/* Animated Glow Effect for Members */}
      {isMember && isHovered && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] bg-gradient-to-br from-purple-600 to-transparent rounded-[2.5rem] transition-opacity duration-500"></div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-8">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-500 ${
              isHovered ? 'rotate-6 scale-110 shadow-2xl' : 'rotate-0 scale-100'
            }`}
            style={{
              backgroundColor: group.color || '#8B5CF6',
              boxShadow: `0 15px 35px -5px ${(group.color || '#8B5CF6')}50`,
            }}
          >
            <DynamicIcon name={group.icon || 'Users'} size={32} />
          </div>
          <div className={`px-4 py-2 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest flex items-center gap-2
            ${isMember ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-600 shadow-sm' : 'bg-gray-50 text-gray-400'}
          `}>
            {isMember && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>}
            {group.membersCount || group.members_count || 0} {t('members') || 'Members'}
          </div>
        </div>

        {/* Title and Description */}
        <div className="mb-8 flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h4 className="text-2xl font-black text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-blue-600 transition-all line-clamp-1">
              {group.name}
            </h4>
            {isMember && (
              <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
            )}
          </div>
          <p className="text-gray-600 text-sm font-medium line-clamp-2 leading-relaxed group-hover:text-gray-700 transition-colors">
            {group.description || t('groupsComingSoon') || 'No description available'}
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-8 pt-6 border-t border-gray-100 group-hover:border-purple-100 transition-colors">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-50/50 group-hover:from-blue-100 group-hover:to-blue-50 transition-all">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200 transition-colors">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{t('members') || 'Members'}</p>
              <p className="text-lg font-black text-gray-900">{group.membersCount || group.members_count || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-50/50 group-hover:from-purple-100 group-hover:to-purple-50 transition-all">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-200 transition-colors">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{t('messages') || 'Messages'}</p>
              <p className="text-lg font-black text-gray-900">{group.messagesCount || group.messages_count || 0}</p>
            </div>
          </div>
        </div>

        {/* Action Button Section */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100 group-hover:border-purple-100 transition-colors">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-300">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">{t('loading') || 'Loading'}</span>
            </div>
          ) : isMember ? (
            <>
              <button
                onClick={handleLeave}
                disabled={actionLoading}
                className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-[10px] font-black uppercase tracking-widest hover:bg-red-50 px-3 py-2 rounded-lg"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                {t('leaveGroup') || 'Leave'}
              </button>
              <div className={`flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-black text-[10px] uppercase tracking-widest transition-all transform ${
                isHovered ? 'translate-x-2 opacity-100' : 'translate-x-0 opacity-75'
              }`}>
                {t('openChat') || 'Open Chat'}
                <ChevronRight size={16} className="text-purple-600" />
              </div>
            </>
          ) : (
            <button
              onClick={handleJoin}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.15em] hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-[0.98] disabled:opacity-50 group-hover:scale-105"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {t('joinGroup') || 'Join Group'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
