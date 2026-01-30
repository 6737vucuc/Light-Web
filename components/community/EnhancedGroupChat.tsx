'use client';

import { useState, useEffect, useRef } from 'react';
import { usePresence } from '@/lib/hooks/usePresence';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Trash2,
  MessageCircle,
  Flag,
  X,
  Pin,
  Star,
  Search,
  Users,
  Eye,
  Settings,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Pusher from 'pusher-js';
import { useToast } from '@/lib/contexts/ToastContext';

interface EnhancedGroupChatProps {
  group: any;
  currentUser: any;
  onBack: () => void;
}

export default function EnhancedGroupChat({ group, currentUser, onBack }: EnhancedGroupChatProps) {
  const t = useTranslations();
  const toast = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Online members tracking
  const [onlineMembers, setOnlineMembers] = useState<any[]>([]);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [onlineMembersCount, setOnlineMembersCount] = useState<number>(0);

  // Advanced features
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [starredMessages, setStarredMessages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showOnlineMembers, setShowOnlineMembers] = useState(false);

  // UI state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<any>(null);
  const [reportReason, setReportReason] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const sessionIdRef = useRef<string>(`${currentUser.id}-${Date.now()}`);

  // ============================================
  // Initialization and Lifecycle
  // ============================================

  useEffect(() => {
    loadMessages();
    joinGroup();
    loadGroupStats();
    loadPinnedMessages();
    initializePusher();

    // Poll for stats every 30 seconds
    const statsInterval = setInterval(loadGroupStats, 30000);

    return () => {
      if (pusherRef.current) {
        pusherRef.current.unsubscribe(`group-${group.id}`);
        pusherRef.current.disconnect();
      }
      clearInterval(statsInterval);
    };
  }, [group.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ============================================
  // Data Loading Functions
  // ============================================

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const joinGroup = async () => {
    try {
      await fetch(`/api/groups/${group.id}/join`, { method: 'POST' });
      loadGroupStats();
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const loadGroupStats = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setTotalMembers(data.totalMembers || 0);
        setOnlineMembersCount(data.onlineMembers || 0);

        // Load detailed online members
        const onlineResponse = await fetch(`/api/groups/${group.id}/features`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getOnlineMembers' }),
        });

        if (onlineResponse.ok) {
          const onlineData = await onlineResponse.json();
          setOnlineMembers(onlineData.onlineMembers || []);
        }
      }
    } catch (error) {
      console.error('Error loading group stats:', error);
    }
  };

  const loadPinnedMessages = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getPinned' }),
      });

      if (response.ok) {
        const data = await response.json();
        setPinnedMessages(data.pinned || []);
      }
    } catch (error) {
      console.error('Error loading pinned messages:', error);
    }
  };

  // ============================================
  // Pusher Real-time Setup
  // ============================================

  const initializePusher = () => {
    if (typeof window !== 'undefined') {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      });

      const channel = pusherRef.current.subscribe(`group-${group.id}`);

      channel.bind('new-message', (data: any) => {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
      });

      channel.bind('delete-message', (data: any) => {
        setMessages((prev) => prev.filter(m => m.id !== data.messageId));
      });

      channel.bind('pusher:subscription_succeeded', (members: any) => {
        setOnlineMembersCount(members.count || 0);
      });

      channel.bind('pusher:member_added', () => {
        setOnlineMembersCount((prev) => prev + 1);
      });

      channel.bind('pusher:member_removed', () => {
        setOnlineMembersCount((prev) => Math.max(0, prev - 1));
      });
    }
  };

  // ============================================
  // Message Operations
  // ============================================

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || isSending) return;

    setIsSending(true);
    try {
      let mediaUrl = null;

      if (selectedImage) {
        const formData = new FormData();
        formData.append('file', selectedImage);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          mediaUrl = uploadData.url;
        }
      }

      const response = await fetch(`/api/groups/${group.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage.trim() || (mediaUrl ? 'Sent an image' : ''),
          messageType: mediaUrl ? 'image' : 'text',
          mediaUrl: mediaUrl,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    const confirmed = await toast.confirm({
      title: t('community.deleteMessage'),
      message: t('community.deleteMessageConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/groups/${group.id}/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessages((prev) => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const pinMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/groups/${group.id}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pin',
          messageId,
          userId: currentUser.id,
        }),
      });

      if (response.ok) {
        loadPinnedMessages();
        toast.success('Message pinned successfully');
      }
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  const starMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/groups/${group.id}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'star',
          messageId,
          userId: currentUser.id,
        }),
      });

      if (response.ok) {
        toast.success('Message starred successfully');
      }
    } catch (error) {
      console.error('Error starring message:', error);
    }
  };

  const searchMessages = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(`/api/groups/${group.id}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: searchQuery,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Error searching messages:', error);
    }
  };

  // ============================================
  // Utility Functions
  // ============================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (date: string) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString('ar-SA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleReportMessage = (message: any) => {
    setReportingMessage(message);
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim() || !reportingMessage) return;

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: reportingMessage.id,
          reportedUserId: reportingMessage.user_id,
          groupId: group.id,
          reason: reportReason,
        }),
      });

      if (response.ok) {
        toast.success('Report submitted successfully');
        setShowReportModal(false);
        setReportingMessage(null);
        setReportReason('');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{group.name}</h2>
              <p className="text-sm text-gray-500">
                {onlineMembersCount} {t('community.online')} • {totalMembers} {t('community.members')}
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5 text-gray-700" />
            </button>

            <button
              onClick={() => setShowPinned(!showPinned)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            >
              <Pin className="w-5 h-5 text-gray-700" />
              {pinnedMessages.length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pinnedMessages.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowOnlineMembers(!showOnlineMembers)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-4 pb-4 flex gap-2">
            <input
              type="text"
              placeholder={t('community.searchMessages')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchMessages()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={searchMessages}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {t('common.search')}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(showSearch && searchResults.length > 0 ? searchResults : messages).map((message) => (
              <div
                key={message.id}
                className="flex gap-3 group"
                onMouseEnter={() => setSelectedMessage(message.id)}
                onMouseLeave={() => setSelectedMessage(null)}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    {message.user?.avatar ? (
                      <Image
                        src={getAvatarUrl(message.user.avatar)}
                        alt={message.user.name}
                        width={40}
                        height={40}
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-sm font-bold">
                        {message.user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{message.user?.name}</span>
                    <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
                  </div>

                  {message.messageType === 'image' && message.media_url ? (
                    <div className="mt-2 max-w-xs">
                      <Image
                        src={message.media_url}
                        alt="Message image"
                        width={300}
                        height={300}
                        className="rounded-lg object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <p className="text-gray-700 mt-1">{message.content}</p>
                  )}

                  {/* Message Actions */}
                  {selectedMessage === message.id && (
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => starMessage(message.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Star message"
                      >
                        <Star className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => pinMessage(message.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Pin message"
                      >
                        <Pin className="w-4 h-4 text-gray-500" />
                      </button>
                      {currentUser.id === message.user_id && (
                        <button
                          onClick={() => deleteMessage(message.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Delete message"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                      <button
                        onClick={() => handleReportMessage(message)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Report message"
                      >
                        <Flag className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-xs max-h-32 rounded-lg"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ImageIcon className="w-5 h-5 text-gray-700" />
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={t('community.typeMessage')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              <button
                onClick={sendMessage}
                disabled={isSending}
                className="p-2 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5 text-purple-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Online Members or Pinned Messages */}
        {showOnlineMembers && (
          <div className="w-64 border-l border-gray-200 overflow-y-auto p-4 bg-gray-50">
            <h3 className="font-bold text-gray-900 mb-4">{t('community.onlineMembers')}</h3>
            <div className="space-y-3">
              {onlineMembers.map((member) => (
                <div key={member.user_id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 relative">
                    {member.user?.avatar ? (
                      <Image
                        src={getAvatarUrl(member.user.avatar)}
                        alt={member.user.name}
                        width={32}
                        height={32}
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                        {member.user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <span className="text-sm text-gray-900">{member.user?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showPinned && (
          <div className="w-64 border-l border-gray-200 overflow-y-auto p-4 bg-gray-50">
            <h3 className="font-bold text-gray-900 mb-4">{t('community.pinnedMessages')}</h3>
            <div className="space-y-3">
              {pinnedMessages.length === 0 ? (
                <p className="text-sm text-gray-500">{t('community.noPinnedMessages')}</p>
              ) : (
                pinnedMessages.map((pinned) => (
                  <div key={pinned.id} className="p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <p className="text-xs font-semibold text-gray-900">{pinned.message?.user?.name}</p>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-3">{pinned.message?.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('community.reportMessage')}</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={t('community.reportReason')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={submitReport}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('common.report')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
