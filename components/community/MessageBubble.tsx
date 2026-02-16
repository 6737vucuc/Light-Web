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
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-2 px-2`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} max-w-[85%] md:max-w-[75%]`}>
        {/* Avatar - Only show for others and not if it's a consecutive message (optional improvement) */}
        {!isOwn && (
          <div 
            className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-sm cursor-pointer hover:opacity-80 transition-opacity self-end mb-1"
            onClick={(e) => onAvatarClick && onAvatarClick(userId, userName, userAvatar, e)}
          >
            {userAvatar ? (
              <Image
                src={getAvatarUrl(userAvatar)}
                alt={userName}
                width={36}
                height={36}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Message Bubble */}
          <div
            className={`relative px-3 py-1.5 shadow-sm transition-all duration-300 ${
              isDeleted 
                ? 'bg-gray-100/80 text-gray-500 italic border border-gray-200 rounded-lg'
                : isOwn
                  ? 'bg-[#dcf8c6] text-gray-900 rounded-lg rounded-tr-none'
                  : 'bg-white text-gray-900 rounded-lg rounded-tl-none'
            }`}
          >
            {/* Sender Name - Inside bubble for groups like WhatsApp */}
            {!isOwn && !isDeleted && (
              <p 
                className="text-[11px] font-bold text-purple-600 mb-0.5 cursor-pointer hover:underline"
                onClick={(e) => onAvatarClick && onAvatarClick(userId, userName, userAvatar, e)}
              >
                {userName}
              </p>
            )}

            {/* Reply Quote */}
            {message.reply_to_content && !isDeleted && (
              <div
                className={`mb-1.5 p-2 rounded-lg text-xs border-l-4 bg-black/5 border-purple-500 text-gray-600`}
              >
                <p className="font-bold text-purple-700 truncate">{message.reply_to_user?.name || 'User'}</p>
                <p className="truncate opacity-80">{message.reply_to_content}</p>
              </div>
            )}

            {isDeleted ? (
              <div className="flex items-center gap-2 text-xs py-1">
                <Ban size={12} />
                <span>{t('messageDeleted')}</span>
              </div>
            ) : (
              <p className="text-[14.5px] leading-tight break-words whitespace-pre-wrap text-black">
                {message.content}
              </p>
            )}

            {/* Timestamp and Status */}
            <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[10px] text-gray-500">
                {formatTime(message.created_at || message.timestamp)}
              </span>
              {isOwn && !isDeleted && (
                <CheckCheck
                  size={13}
                  className={message.isRead ? "text-blue-500" : "text-gray-400"}
                />
              )}
            </div>

            {/* Hover Actions */}
            {isHovered && !isDeleted && (
              <div className={`absolute top-0 ${isOwn ? '-left-10' : '-right-10'} flex flex-col gap-1 z-10`}>
                {onReply && (
                  <button
                    onClick={() => onReply(message)}
                    className="p-1.5 bg-white text-gray-500 hover:text-purple-600 rounded-full shadow-md border border-gray-100 transition-all hover:scale-110"
                  >
                    <Reply size={14} />
                  </button>
                )}
                {isOwn && onDelete && (
                  <button
                    onClick={() => onDelete(message.id)}
                    className="p-1.5 bg-white text-gray-500 hover:text-red-600 rounded-full shadow-md border border-gray-100 transition-all hover:scale-110"
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
