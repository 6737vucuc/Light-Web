'use client';

import { useState } from 'react';
import { CheckCheck, Reply, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
  onReply?: (message: any) => void;
  onDelete?: (messageId: number) => void;
  onAvatarClick?: (userId: string | number, userName: string, avatar: string | null, e: React.MouseEvent) => void;
}

export default function MessageBubble({
  message,
  isOwn,
  onReply,
  onDelete,
  onAvatarClick,
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatTime = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const user = message.user || {};
  const userName = user.name || 'User';
  const userAvatar = user.avatar || null;
  const userId = message.userId || message.user_id;

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-4`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} max-w-[85%] md:max-w-[70%]`}>
        {/* Avatar */}
        {!isOwn && (
          <div 
            className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => onAvatarClick && onAvatarClick(userId, userName, userAvatar, e)}
          >
            {userAvatar ? (
              <Image
                src={getAvatarUrl(userAvatar)}
                alt={userName}
                width={32}
                height={32}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender Name */}
          {!isOwn && (
            <span 
              className="text-[10px] font-bold text-gray-500 mb-1 ml-2 uppercase tracking-wider cursor-pointer hover:text-purple-600"
              onClick={(e) => onAvatarClick && onAvatarClick(userId, userName, userAvatar, e)}
            >
              {userName}
            </span>
          )}

          {/* Reply Quote */}
          {message.reply_to_content && (
            <div
              className={`mb-1 p-2 rounded-xl text-xs border-l-4 max-w-full ${
                isOwn
                  ? 'bg-white/10 border-white/30 text-white/80'
                  : 'bg-gray-100 border-purple-500 text-gray-600'
              }`}
            >
              <p className="font-bold opacity-70 truncate">{message.reply_to_user?.name || 'User'}</p>
              <p className="truncate">{message.reply_to_content}</p>
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`relative px-4 py-3 shadow-sm transition-all duration-300 ${
              isOwn
                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-[1.5rem] rounded-tr-none'
                : 'bg-white text-gray-800 border border-gray-100 rounded-[1.5rem] rounded-tl-none'
            }`}
          >
            <p className="text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap">
              {message.content}
            </p>

            {/* Timestamp and Status */}
            <div className={`flex items-center gap-1.5 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[9px] font-bold opacity-60">
                {formatTime(message.created_at || message.timestamp)}
              </span>
              {isOwn && (
                <CheckCheck
                  size={12}
                  className="opacity-60"
                />
              )}
            </div>

            {/* Hover Actions */}
            {isHovered && (
              <div className={`absolute top-0 ${isOwn ? '-left-12' : '-right-12'} flex flex-col gap-1`}>
                {onReply && (
                  <button
                    onClick={() => onReply(message)}
                    className="p-2 bg-white text-gray-500 hover:text-purple-600 rounded-full shadow-md border border-gray-100 transition-all hover:scale-110"
                    title="Reply"
                  >
                    <Reply size={14} />
                  </button>
                )}
                {isOwn && onDelete && (
                  <button
                    onClick={() => onDelete(message.id)}
                    className="p-2 bg-white text-gray-500 hover:text-red-600 rounded-full shadow-md border border-gray-100 transition-all hover:scale-110"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
