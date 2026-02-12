'use client';

import { useMemo } from 'react';

interface TypingIndicatorProps {
  typingUsers: Array<{ name: string; userId: number }>;
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  const displayText = useMemo(() => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} يكتب الآن`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].name} و ${typingUsers[1].name} يكتبان الآن`;
    }
    return `${typingUsers.length} أشخاص يكتبون الآن`;
  }, [typingUsers]);

  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full animate-pulse">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className="text-xs font-black text-purple-600 uppercase tracking-widest">{displayText}</span>
    </div>
  );
}
