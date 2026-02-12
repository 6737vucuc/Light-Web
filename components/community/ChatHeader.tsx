'use client';

import { X, MoreVertical } from 'lucide-react';
import Image from 'next/image';
import OnlineStatus from './OnlineStatus';

interface ChatHeaderProps {
  recipientName: string;
  recipientAvatar?: string;
  isTyping?: boolean;
  isOnline?: boolean;
  onClose: () => void;
}

export default function ChatHeader({
  recipientName,
  recipientAvatar,
  isTyping = false,
  isOnline = true,
  onClose,
}: ChatHeaderProps) {
  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  return (
    <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-50 shadow-md">
            {recipientAvatar ? (
              <Image src={getAvatarUrl(recipientAvatar)} alt={recipientName} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-xl font-black">
                {recipientName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'} border-2 border-white rounded-full`}></div>
        </div>
        <div>
          <h3 className="font-black text-gray-900 leading-none mb-1.5">{recipientName}</h3>
          <div className="flex items-center gap-2">
            {isTyping ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 rounded-full">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">يكتب...</span>
              </div>
            ) : (
              <OnlineStatus userId={0} userName={recipientName} isOnline={isOnline} />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onClose}
          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
