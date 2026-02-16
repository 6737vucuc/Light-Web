'use client';

import { useState } from 'react';
import { CheckCheck, Reply, Trash2, Ban } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('messages');
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
  const isDeleted = message.content === 'MESSAGE_DELETED_BY_SENDER' || message.isDeleted;

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-3 px-2 animate-in fade-in slide-in-from-bottom-1 duration-300`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} max-w-[85%] md:max-w-[75%]`}>
        {/* Modern Avatar */}
        {!isOwn && (
          <div 
            className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm cursor-pointer hover:scale-110 transition-transform self-end mb-1 border-2 border-white"
            onClick={(e) => onAvatarClick && onAvatarClick(userId, userName, userAvatar, e)}
          >
            {userAvatar ? (
              <Image
                src={getAvatarUrl(userAvatar)}
                alt={userName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-sm font-black">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Modern Message Bubble */}
          <div
            className={`relative px-4 py-2.5 shadow-sm transition-all duration-300 hover:shadow-md ${
              isDeleted 
                ? 'bg-slate-100 text-slate-400 italic border border-slate-200 rounded-2xl'
                : isOwn
                  ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-2xl rounded-tr-none'
                  : 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100'
            }`}
          >
            {/* Sender Name - Modern Style */}
            {!isOwn && !isDeleted && (
              <p 
                className="text-[11px] font-black text-indigo-600 mb-1 cursor-pointer hover:underline uppercase tracking-wider"
                onClick={(e) => onAvatarClick && onAvatarClick(userId, userName, userAvatar, e)}
              >
                {userName}
              </p>
            )}

            {/* Modern Reply Quote */}
            {message.reply_to_content && !isDeleted && (
              <div
                className={`mb-2 p-2 rounded-xl text-xs border-l-4 bg-black/5 border-indigo-500 text-slate-600`}
              >
                <p className="font-black text-indigo-700 truncate mb-0.5">{message.reply_to_user?.name || 'User'}</p>
                <p className="truncate opacity-80 font-medium">{message.reply_to_content}</p>
              </div>
            )}

            {isDeleted ? (
              <div className="flex items-center gap-2 text-xs py-1 font-medium">
                <Ban size={14} />
                <span>{t('messageDeleted')}</span>
              </div>
            ) : (
              <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">
                {message.content}
              </p>
            )}

            {/* Timestamp and Status */}
            <div className={`flex items-center gap-1.5 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
                {formatTime(message.created_at || message.timestamp)}
              </span>
              {isOwn && !isDeleted && (
                <CheckCheck
                  size={14}
                  className={message.isRead ? "text-sky-300" : "text-white/40"}
                />
              )}
            </div>

            {/* Modern Hover Actions */}
            {isHovered && !isDeleted && (
              <div className={`absolute top-0 ${isOwn ? '-left-12' : '-right-12'} flex flex-col gap-2 z-10 animate-in fade-in zoom-in-95`}>
                {onReply && (
                  <button
                    onClick={() => onReply(message)}
                    className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-xl shadow-lg border border-slate-100 transition-all hover:scale-110"
                  >
                    <Reply size={16} />
                  </button>
                )}
                {isOwn && onDelete && (
                  <button
                    onClick={() => onDelete(message.id)}
                    className="p-2 bg-white text-slate-400 hover:text-rose-600 rounded-xl shadow-lg border border-slate-100 transition-all hover:scale-110"
                  >
                    <Trash2 size={16} />
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
