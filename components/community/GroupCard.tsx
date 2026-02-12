'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Users, MessageCircle, LogIn, LogOut, Loader2, ArrowRight, ChevronRight } from 'lucide-react';
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
        toast.show(t('joinedSuccess'), 'success');
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
    if (!confirm(t('leaveGroupConfirm'))) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/membership`, { method: 'DELETE' });
      if (res.ok) {
        setIsMember(false);
        toast.show(t('leftSuccess'), 'success');
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
    // Prevent rendering issues if name is not a string or empty
    const iconName = typeof name === 'string' && name ? name : 'Users';
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Users;
    return <IconComponent size={size} />;
  };

  return (
    <div
      onClick={() => isMember && onOpenChat(group)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50 transition-all duration-500 cursor-pointer overflow-hidden group
        ${isMember ? 'hover:border-purple-200 hover:shadow-[0_30px_60px_-20px_rgba(124,58,237,0.15)]' : 'hover:border-gray-200'}
      `}
    >
      {/* Animated Background Accent */}
      <div
        className={`absolute top-0 right-0 w-40 h-40 opacity-0 group-hover:opacity-[0.08] transition-all duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
        style={{
          backgroundColor: group.color || '#8B5CF6',
          borderRadius: '0 0 0 100%',
        }}
      ></div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-8">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-500 ${
              isHovered ? 'rotate-6 scale-110' : 'rotate-0 scale-100'
            }`}
            style={{
              backgroundColor: group.color || '#8B5CF6',
              boxShadow: `0 10px 25px -5px ${(group.color || '#8B5CF6')}40`,
            }}
          >
            <DynamicIcon name={group.icon || 'Users'} size={32} />
          </div>
          <div className={`px-4 py-2 rounded-2xl text-[10px] font-black transition-colors uppercase tracking-widest
            ${isMember ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-400'}
          `}>
            {group.membersCount || group.members_count || 0} {t('members')}
          </div>
        </div>

        {/* Title and Description */}
        <div className="mb-8 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-2xl font-black text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-1">
              {group.name}
            </h4>
            {isMember && (
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </div>
          <p className="text-gray-500 text-sm font-medium line-clamp-2 leading-relaxed">
            {group.description || t('groupsComingSoon')}
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-8 pt-6 border-t border-gray-50 group-hover:border-purple-50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">{t('members')}</p>
              <p className="text-lg font-black text-gray-900">{group.membersCount || group.members_count || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">{t('messages')}</p>
              <p className="text-lg font-black text-gray-900">{group.messagesCount || group.messages_count || 0}</p>
            </div>
          </div>
        </div>

        {/* Action Button Section */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-50 group-hover:border-purple-50 transition-colors">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-300">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">{t('loading')}</span>
            </div>
          ) : isMember ? (
            <>
              <button
                onClick={handleLeave}
                disabled={actionLoading}
                className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                {t('leaveGroup')}
              </button>
              <div className={`flex items-center gap-2 text-purple-600 font-black text-[10px] uppercase tracking-widest transition-all transform ${
                isHovered ? 'translate-x-2' : 'translate-x-0'
              }`}>
                {t('openChat')}
                <ChevronRight size={16} />
              </div>
            </>
          ) : (
            <button
              onClick={handleJoin}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gray-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-purple-600 transition-all shadow-xl shadow-gray-200 hover:shadow-purple-200 active:scale-[0.98] disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {t('joinGroup')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
