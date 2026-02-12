'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Image as ImageIcon, MoreHorizontal, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  onTyping?: (isTyping: boolean) => void;
  isSending?: boolean;
  placeholder?: string;
  replyTo?: any;
  onClearReply?: () => void;
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  onTyping,
  isSending = false,
  placeholder = 'اكتب رسالتك هنا...',
  replyTo,
  onClearReply,
}: MessageInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    
    if (onTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping(true);
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(e as any);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    onChange(value + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="p-6 bg-white border-t border-gray-100 space-y-3">
      {replyTo && (
        <div className="p-3 bg-purple-50 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-purple-600">الرد على</p>
            <p className="text-sm text-gray-600 truncate">{replyTo.content}</p>
          </div>
          {onClearReply && (
            <button onClick={onClearReply} className="p-1 hover:bg-purple-100 rounded-full text-purple-400">
              <X size={18} />
            </button>
          )}
        </div>
      )}

      <form onSubmit={onSend} className="flex items-end gap-3">
        <div className="flex-1 bg-gray-50 rounded-[1.5rem] border border-gray-200 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all flex flex-col overflow-hidden relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent border-none focus:ring-0 p-4 text-sm md:text-base resize-none max-h-32 min-h-[56px]"
            rows={1}
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1 relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
              >
                <Smile size={20} />
              </button>
              <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
                <Paperclip size={20} />
              </button>
              <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
                <ImageIcon size={20} />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-50">
                  <EmojiPicker onEmojiClick={onEmojiClick} theme="light" />
                </div>
              )}
            </div>
            <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={!value.trim() || isSending}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
            value.trim() && !isSending
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-100 active:scale-90'
              : 'bg-gray-100 text-gray-400 scale-95'
          }`}
        >
          {isSending ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={24} className={value.trim() ? 'translate-x-0.5' : ''} />
          )}
        </button>
      </form>
    </div>
  );
}
