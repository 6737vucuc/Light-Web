'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Search, Check, CheckCheck } from 'lucide-react';
import Image from 'next/image';

interface Conversation {
  id: number;
  type: string;
  name: string | null;
  avatar: string | null;
  lastMessageAt: string;
  lastMessage: {
    content: string | null;
    senderId: number;
    createdAt: string;
  } | null;
  participants: {
    id: number;
    name: string;
    avatar: string | null;
    isOnline: boolean;
    lastSeen: string | null;
  }[];
  unreadCount: number;
  lastReadAt: string;
}

interface ConversationListProps {
  currentUserId: number;
  onSelectConversation: (conversationId: number) => void;
  selectedConversationId: number | null;
}

export default function ConversationList({
  currentUserId,
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter((conv) => {
    const otherParticipant = conv.participants[0];
    const displayName = conv.type === 'group' ? conv.name : otherParticipant?.name;
    return displayName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No conversations yet
            </h3>
            <p className="text-sm text-gray-500">
              Start a conversation from the community page
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherParticipant = conv.participants[0];
            const displayName = conv.type === 'group' ? conv.name : otherParticipant?.name;
            const displayAvatar = conv.type === 'group' ? conv.avatar : otherParticipant?.avatar;
            const isOnline = conv.type === 'direct' && otherParticipant?.isOnline;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-gray-100 hover:bg-gray-50 ${
                  selectedConversationId === conv.id ? 'bg-purple-50 border-l-4 border-l-purple-600' : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                    {displayAvatar ? (
                      <Image
                        src={getAvatarUrl(displayAvatar)}
                        alt={displayName || 'User'}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-lg font-bold">
                        {displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {displayName || 'Unknown'}
                    </h4>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate flex-1">
                      {conv.lastMessage?.senderId === currentUserId && (
                        <span className="inline-flex mr-1">
                          {conv.unreadCount === 0 ? (
                            <CheckCheck className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Check className="w-4 h-4 text-gray-400" />
                          )}
                        </span>
                      )}
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
