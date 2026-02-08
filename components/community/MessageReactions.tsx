'use client';

import { useState } from 'react';
import { Smile, X } from 'lucide-react';

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface MessageReactionsProps {
  messageId: number;
  reactions: Reaction[];
  onAddReaction: (emoji: string) => Promise<void>;
  onRemoveReaction: (emoji: string) => Promise<void>;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function MessageReactions({
  messageId,
  reactions = [],
  onAddReaction,
  onRemoveReaction,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReactionClick = async (emoji: string) => {
    setIsLoading(true);
    try {
      const reaction = reactions.find(r => r.emoji === emoji);
      if (reaction?.userReacted) {
        await onRemoveReaction(emoji);
      } else {
        await onAddReaction(emoji);
      }
    } finally {
      setIsLoading(false);
      setShowPicker(false);
    }
  };

  return (
    <div className="relative">
      {/* Reactions Display */}
      {reactions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {reactions.map(reaction => (
            <button
              key={reaction.emoji}
              onClick={() => handleReactionClick(reaction.emoji)}
              disabled={isLoading}
              className={`px-2 py-1 rounded-full text-sm font-bold transition-all hover:scale-110 ${
                reaction.userReacted
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {reaction.emoji} {reaction.count}
            </button>
          ))}

          {/* Add Reaction Button */}
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all"
          >
            <Smile size={14} />
          </button>
        </div>
      )}

      {/* Reaction Picker */}
      {showPicker && (
        <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex gap-2 flex-wrap max-w-[200px]">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="w-8 h-8 hover:bg-gray-100 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
