'use client';

import { useState } from 'react';
import { CheckCheck, Reply, Trash2, Edit } from 'lucide-react';
import Image from 'next/image';

interface MessageBubbleProps {
  message: any;
  isMine: boolean;
  onReply?: (message: any) => void;
  onDelete?: (messageId: number) => void;
  senderAvatar?: string;
  senderName?: string;
}

export default function MessageBubble({
  message,
  isMine,
  onReply,
  onDelete,
  senderAvatar,
  senderName,
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  return (
    <div
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'} max-w-[85%] md:max-w-[70%]`}>
        {/* Avatar */}
        {!isMine && senderAvatar && (
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm">
            <Image
              src={getAvatarUrl(senderAvatar)}
              alt={senderName || 'User'}
              width={32}
              height={32}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        )}

        <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          {/* Sender Name (for group messages) */}
          {!isMine && senderName && (
            <span className="text-[10px] font-bold text-gray-500 mb-1 ml-2 uppercase tracking-wider">
              {senderName}
            </span>
          )}

          {/* Reply Quote */}
          {message.reply_to_content && (
            <div
              className={`mb-2 p-2 rounded-lg text-xs border-l-4 max-w-full ${
                isMine
                  ? 'bg-white/10 border-white/30 text-white/80'
                  : 'bg-gray-50 border-purple-500 text-gray-600'
              }`}
            >
              <p className="font-bold opacity-70 truncate">{message.reply_to_user?.name}</p>
              <p className="truncate">{message.reply_to_content}</p>
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`relative px-4 py-3 shadow-sm transition-all duration-300 ${
              isMine
                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-[1.5rem] rounded-tr-none hover:shadow-lg hover:shadow-purple-300'
                : 'bg-white text-gray-800 border border-gray-100 rounded-[1.5rem] rounded-tl-none hover:border-purple-200'
            }`}
          >
            <p className="text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap">
              {message.content}
            </p>

            {/* Timestamp and Read Status */}
            <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[9px] font-bold opacity-60">
                {formatTime(message.created_at || message.timestamp)}
              </span>
              {isMine && (
                <CheckCheck
                  size={12}
                  className={`opacity-60 ${message.isRead ? 'text-blue-300' : 'text-white/40'}`}
                />
              )}
            </div>

            {/* Hover Actions */}
            {isHovered && (
              <div className={`absolute top-0 ${isMine ? '-left-14' : '-right-14'} flex gap-1 bg-white rounded-xl shadow-lg p-1 border border-gray-100`}>
                {onReply && (
                  <button
                    onClick={() => onReply(message)}
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Reply"
                  >
                    <Reply size={16} />
                  </button>
                )}
                {isMine && onDelete && (
                  <button
                    onClick={() => onDelete(message.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
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
