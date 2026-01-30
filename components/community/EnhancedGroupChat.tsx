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
  ChevronDown,
  ChevronUp,
  Phone,
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
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showUserProfile, setShowUserProfile] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const sessionIdRef = useRef<string>(`${currentUser?.id || 'guest'}-${Date.now()}`);

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

  const loadGroupStats = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setTotalMembers(data.totalMembers || 0);
        setOnlineMembersCount(data.onlineMembers || 0);
        setOnlineMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error loading group stats:', error);
    }
  };

  const loadPinnedMessages = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/pinned`);
      if (response.ok) {
        const data = await response.json();
        setPinnedMessages(data.pinnedMessages || []);
      }
    } catch (error) {
      console.error('Error loading pinned messages:', error);
    }
  };

  const joinGroup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/groups/${group.id}/join`, { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast?.success(t('joined_successfully') || 'Joined successfully');
        // Reload messages and stats to enter the chat
        await Promise.all([
          loadMessages(),
          loadGroupStats(),
          loadPinnedMessages()
        ]);
        // Force a small delay to ensure state is updated
        setTimeout(() => setIsLoading(false), 500);
      } else {
        console.error('Join failed:', data);
        toast?.error(data.error || 'Failed to join group');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Error joining group:', error);
      toast?.error('Connection error');
      setIsLoading(true);
    }
  };

  const leaveGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/leave`, { method: 'POST' });
      if (response.ok) {
        toast?.success('Left group successfully');
        onBack();
      } else {
        toast?.error('Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast?.error('Failed to leave group');
    }
  };

  const initializePusher = () => {
    if (pusherRef.current) return;

    // Use correct environment variable names from .env.example
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster) {
      console.warn('Pusher credentials missing, real-time features may not work');
      return;
    }

    pusherRef.current = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: `/api/pusher/auth`,
    });

    const channel = pusherRef.current.subscribe(`group-${group.id}`);

    channel.bind('new-message', (data: any) => {
      setMessages((prev) => [...prev, data]);
    });

    channel.bind('message-deleted', (data: any) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    channel.bind('presence-update', (data: any) => {
      loadGroupStats();
    });

    channel.bind('member-left', (data: any) => {
      setTotalMembers(data.totalMembers);
      loadGroupStats();
    });

    channel.bind('member-joined', (data: any) => {
      setTotalMembers(data.totalMembers);
      loadGroupStats();
    });
  };

  // ============================================
  // Message Functions
  // ============================================

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;
    if (!group?.id) return;

    setIsSending(true);
    try {
      // Use JSON for text messages, FormData for images
      if (selectedImage) {
        const formData = new FormData();
        formData.append('content', newMessage);
        formData.append('image', selectedImage);
        if (replyingTo) {
          formData.append('replyToId', replyingTo.id.toString());
        }

        const response = await fetch(`/api/groups/${group.id}/messages`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setNewMessage('');
          setSelectedImage(null);
          setImagePreview(null);
          setReplyingTo(null);
          loadMessages();
          toast?.success('Message sent successfully');
        } else {
          const error = await response.json();
          console.error('Failed to send message with image:', error);
          toast?.error(error.error || 'Failed to send message');
        }
      } else {
        // Send as JSON for text-only messages
        const response = await fetch(`/api/groups/${group.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newMessage,
            messageType: 'text',
            replyToId: replyingTo?.id,
          }),
        });

        if (response.ok) {
          setNewMessage('');
          setReplyingTo(null);
          loadMessages();
          toast?.success('Message sent successfully');
        } else {
          const error = await response.json();
          console.error('Failed to send text message:', error);
          toast?.error(error.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast?.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId: number, deleteForEveryone: boolean = true) => {
    try {
      const response = await fetch(`/api/groups/${group?.id}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteForEveryone }),
      });

      if (response.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        toast?.success(deleteForEveryone ? 'Message deleted for everyone' : 'Message deleted');
        setSelectedMessage(null);
      } else {
        const error = await response.json();
        toast?.error(error.error || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast?.error('Failed to delete message');
    }
  };

  const pinMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/groups/${group.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });

      if (response.ok) {
        loadPinnedMessages();
        toast?.success('Message pinned');
      }
    } catch (error) {
      console.error('Error pinning message:', error);
      toast?.error('Failed to pin message');
    }
  };

  const starMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/groups/${group.id}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });

      if (response.ok) {
        toast?.success('Message starred');
      }
    } catch (error) {
      console.error('Error starring message:', error);
      toast?.error('Failed to star message');
    }
  };

  const searchMessages = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/groups/${group.id}/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Error searching messages:', error);
      toast?.error('Failed to search messages');
    }
  };

  const handleReportMessage = (message: any) => {
    setReportingMessage(message);
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      toast?.error('Please provide a reason');
      return;
    }

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: reportingMessage.id,
          groupId: group.id,
          reason: reportReason,
        }),
      });

      if (response.ok) {
        setShowReportModal(false);
        setReportReason('');
        setReportingMessage(null);
        toast?.success('Report submitted');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast?.error('Failed to submit report');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarUrl = (avatar: string | null): string => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-120px)] bg-gradient-to-br from-purple-50 via-white to-pink-50 rounded-2xl shadow-lg overflow-hidden border border-purple-100">
      {/* Header - Mobile Optimized */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-3 md:p-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white/30">
            {group?.name?.charAt(0)?.toUpperCase() || 'G'}
          </div>
          <div>
            <h2 className="font-bold text-white text-sm md:text-lg leading-tight drop-shadow-sm">{group?.name || 'Group'}</h2>
            <div className="flex items-center gap-2 text-[10px] md:text-xs text-white/80">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-sm"></div>
                {onlineMembersCount} Online
              </span>
              <span className="text-white/50">•</span>
              <span>{totalMembers} Members</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <Search className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => setShowPinned(!showPinned)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <Pin className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => setShowOnlineMembers(!showOnlineMembers)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <Users className="w-5 h-5 text-white" />
          </button>
          <div className="relative">
            <button onClick={() => setShowGroupOptions(!showGroupOptions)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
            {showGroupOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                <button
                  onClick={leaveGroup}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Leave Group
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-white p-3 border-b border-gray-200 animate-in slide-in-from-top duration-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchMessages()}
              placeholder="Search messages..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
            <button onClick={searchMessages} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              Search
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
              {searchResults.map((res) => (
                <div key={res.id} className="p-2 hover:bg-gray-50 rounded border border-gray-100 cursor-pointer">
                  <p className="text-xs font-bold text-purple-600">{res.user?.name}</p>
                  <p className="text-sm text-gray-900 line-clamp-1">{res.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-6 scrollbar-hide">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 md:gap-3 group ${selectedMessage === message.id ? 'bg-purple-50/50 rounded-xl p-2 -m-2' : ''}`}
                onClick={() => setSelectedMessage(selectedMessage === message.id ? null : message.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (message.user?.id !== currentUser?.id) {
                      setShowUserProfile(message.user);
                    }
                  }}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 shadow-sm hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer"
                >
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
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-sm">
                      {message.user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm md:text-base">{message.user?.name}</span>
                    <span className="text-[10px] md:text-xs text-gray-500">{formatTime(message.createdAt)}</span>
                  </div>

                  {/* Reply Preview */}
                  {message.parentMessage && (
                    <div className="mt-1 mb-1 p-2 bg-gray-100/80 border-l-4 border-purple-400 rounded text-xs text-gray-600 line-clamp-2">
                      <span className="font-bold block text-[10px] text-purple-600">{message.parentMessage.user?.name}</span>
                      {message.parentMessage.content}
                    </div>
                  )}

                  {message.type === 'image' && message.imageUrl ? (
                    <div className="mt-2 max-w-xs">
                      <Image
                        src={message.imageUrl}
                        alt="Message image"
                        width={300}
                        height={300}
                        className="rounded-lg object-cover shadow-sm"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <p className="text-gray-900 mt-1 text-sm md:text-base break-words leading-relaxed">{message.content}</p>
                  )}

                  {/* Message Actions - Mobile Optimized */}
                  {selectedMessage === message.id && (
                    <div className="flex gap-1 mt-2 flex-wrap animate-in fade-in slide-in-from-bottom-1 duration-200">
                      <button
                        onClick={(e) => { e.stopPropagation(); setReplyingTo(message); }}
                        className="p-1.5 bg-white hover:bg-gray-100 rounded-lg shadow-sm border border-gray-100 transition-colors"
                        title="Reply"
                      >
                        <MessageCircle className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); starMessage(message.id); }}
                        className="p-1.5 bg-white hover:bg-gray-100 rounded-lg shadow-sm border border-gray-100 transition-colors"
                        title="Star"
                      >
                        <Star className="w-4 h-4 text-yellow-500" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); pinMessage(message.id); }}
                        className="p-1.5 bg-white hover:bg-gray-100 rounded-lg shadow-sm border border-gray-100 transition-colors"
                        title="Pin"
                      >
                        <Pin className="w-4 h-4 text-purple-500" />
                      </button>
                      {currentUser.id === message.userId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMessage(message.id); }}
                          className="p-1.5 bg-white hover:bg-gray-100 rounded-lg shadow-sm border border-gray-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReportMessage(message); }}
                        className="p-1.5 bg-white hover:bg-gray-100 rounded-lg shadow-sm border border-gray-100 transition-colors"
                        title="Report"
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

          {/* Message Input - Mobile Optimized */}
          <div className="border-t border-gray-200 p-3 md:p-4 bg-white/95 backdrop-blur">
            {/* Reply Bar */}
            {replyingTo && (
              <div className="mb-3 p-2 bg-purple-50 border-l-4 border-purple-500 rounded flex justify-between items-center animate-in slide-in-from-bottom-2 duration-200">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-purple-600">Replying to {replyingTo.user?.name}</p>
                  <p className="text-xs text-gray-600 truncate">{replyingTo.content}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-purple-100 rounded-full">
                  <X className="w-4 h-4 text-purple-500" />
                </button>
              </div>
            )}

            {imagePreview && (
              <div className="mb-3 relative inline-block animate-in zoom-in duration-200">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-xs max-h-32 rounded-lg shadow-md"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0 bg-gray-50"
              >
                <ImageIcon className="w-5 h-5 text-gray-700" />
              </button>

              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type..."
                  rows={1}
                  className="w-full px-4 py-2.5 text-sm md:text-base border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-gray-50 resize-none max-h-32"
                />
              </div>

              <button
                onClick={sendMessage}
                disabled={isSending || (!newMessage.trim() && !selectedImage)}
                className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:bg-gray-300 flex-shrink-0 shadow-md active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Online Members or Pinned Messages - Mobile Optimized */}
        {showOnlineMembers && (
          <div className="absolute inset-y-0 right-0 w-full md:w-72 md:relative bg-white/98 backdrop-blur border-l border-gray-200 z-20 animate-in slide-in-from-right duration-300">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Online Members</h3>
                <button onClick={() => setShowOnlineMembers(false)} className="md:hidden p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {onlineMembers.map((member) => (
                  <div key={member.userId} className="flex items-center gap-3 p-2 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 relative flex-shrink-0 shadow-sm">
                      {member.user?.avatar ? (
                        <Image
                          src={getAvatarUrl(member.user.avatar)}
                          alt={member.user.name}
                          width={40}
                          height={40}
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-sm font-bold">
                          {member.user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{member.user?.name}</p>
                      <p className="text-[10px] text-green-600 font-medium">Active now</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showPinned && (
          <div className="absolute inset-y-0 right-0 w-full md:w-72 md:relative bg-white/98 backdrop-blur border-l border-gray-200 z-20 animate-in slide-in-from-right duration-300">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Pinned Messages</h3>
                <button onClick={() => setShowPinned(false)} className="md:hidden p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {pinnedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <Pin className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">No pinned messages</p>
                  </div>
                ) : (
                  pinnedMessages.map((pinned) => (
                    <div key={pinned.id} className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-[10px] font-bold text-purple-700">
                          {pinned.message?.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs font-bold text-gray-900 truncate">{pinned.message?.user?.name}</p>
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed">{pinned.message?.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Modal - Send Private Message */}
      {showUserProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 md:p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            {/* User Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 shadow-lg mb-3">
                {showUserProfile.avatar ? (
                  <Image
                    src={getAvatarUrl(showUserProfile.avatar)}
                    alt={showUserProfile.name}
                    width={80}
                    height={80}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-2xl">
                    {showUserProfile.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{showUserProfile.name}</h3>
              {showUserProfile.username && (
                <p className="text-sm text-gray-500">@{showUserProfile.username}</p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  router.push(`/messages?userId=${showUserProfile.id}`);
                  setShowUserProfile(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                {t('sendPrivateMessage') || 'Send Private Message'}
              </button>

              <button
                onClick={() => {
                  router.push(`/messages?userId=${showUserProfile.id}&call=voice`);
                  setShowUserProfile(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg"
              >
                <Phone className="w-5 h-5" />
                {t('voiceCall') || 'Voice Call'}
              </button>
              
              <button
                onClick={() => {
                  router.push(`/profile/${showUserProfile.id}`);
                  setShowUserProfile(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
              >
                <Eye className="w-5 h-5" />
                {t('viewProfile') || 'View Profile'}
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowUserProfile(null)}
              className="mt-4 w-full px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Report Modal - Mobile Optimized */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 md:p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Report Message</h3>
            <p className="text-sm text-gray-500 mb-4">Why are you reporting this message?</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Provide a reason..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 mb-6 text-gray-900 text-sm md:text-base bg-gray-50"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-semibold shadow-lg shadow-red-200"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
