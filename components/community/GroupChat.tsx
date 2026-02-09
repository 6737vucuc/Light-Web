'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Image as ImageIcon, Smile, MoreVertical, Trash2, MessageCircle, Flag, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';

interface GroupChatProps {
  group: any;
  currentUser: any;
  onBack: () => void;
}

export default function GroupChat({ group, currentUser, onBack }: GroupChatProps) {
  const t = useTranslations();
  const toast = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{[key: number]: string}>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [onlineMembers, setOnlineMembers] = useState<number>(0);;
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<any>(null);
  const [reportReason, setReportReason] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    loadMessages();
    joinGroup();
    loadGroupStats();
    
    // Poll for stats every 30 seconds
    const statsInterval = setInterval(loadGroupStats, 30000);

    if (typeof window !== 'undefined') {
      
      channel.bind('new-message', (data: any) => {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
      });

      channel.bind('delete-message', (data: any) => {
        setMessages((prev) => prev.filter(m => m.id !== data.messageId));
      });
      
      // Real-time typing status using Supabase Broadcast
      const typingChannel = supabase.channel(`group-typing-${group.id}`);
      
      typingChannel
        .on('broadcast', { event: 'typing' }, (payload) => {
          const { userId, userName, isTyping } = payload.payload;
          if (userId !== currentUser.id) {
            setTypingUsers(prev => {
              const newState = { ...prev };
              if (isTyping) {
                newState[userId] = userName;
              } else {
                delete newState[userId];
              }
              return newState;
            });
          }
        })
        .subscribe();

      // Store channel for cleanup
      (window as any).groupTypingChannel = typingChannel;

      // Listen for member presence updates
        setOnlineMembers(members.count || 0);
      });

        setOnlineMembers((prev) => prev + 1);
      });

        setOnlineMembers((prev) => Math.max(0, prev - 1));
      });
    }

    return () => {
    }
    if ((window as any).groupTypingChannel) {
      supabase.removeChannel((window as any).groupTypingChannel);
    }
    clearInterval(statsInterval);
  };
}, [group.id, currentUser.id]);

// Handle typing broadcast
useEffect(() => {
  if (!group || !currentUser) return;
  
  const channel = (window as any).groupTypingChannel;
  if (!channel) return;
  
  const sendTypingStatus = (typing: boolean) => {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUser.id, userName: currentUser.name, isTyping: typing },
    });
  };

  if (isTyping) {
    sendTypingStatus(true);
  } else {
    sendTypingStatus(false);
  }
}, [isTyping, group, currentUser]);

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setNewMessage(e.target.value);
  
  if (!isTyping) {
    setIsTyping(true);
  }
  
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  
  typingTimeoutRef.current = setTimeout(() => {
    setIsTyping(false);
  }, 3000);
};

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
        setOnlineMembers(data.onlineMembers || 0);
      }
    } catch (error) {
      console.error('Error loading group stats:', error);
    }
  };

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

      // Upload image if selected
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
        alert('تم إرسال البلاغ بنجاح. سيتم مراجعته من قبل الإدارة.');
        setShowReportModal(false);
        setReportingMessage(null);
        setReportReason('');
      } else {
        const data = await response.json();
        alert(data.error || 'فشل إرسال البلاغ');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('حدث خطأ أثناء إرسال البلاغ');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-[calc(100vh-200px)] md:h-[600px] flex flex-col">
      {/* Chat Header */}
      <div
        className="p-4 flex items-center gap-3 border-b border-gray-200"
        style={{
          background: `linear-gradient(135deg, ${group.color} 0%, ${group.color}dd 100%)`,
        }}
      >
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-white">{group.name}</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-white/80">{totalMembers} أعضاء</p>
            <span className="text-white/60">•</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-sm text-white/80">
                {Object.values(typingUsers).length > 0 
                  ? `${Object.values(typingUsers).join(', ')} يكتب الآن...`
                  : `${onlineMembers} متصل الآن`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-center">No messages yet</p>
            <p className="text-sm text-center mt-1">Be the first to start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.user_id === currentUser.id;
            
            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {!isOwnMessage && (
                  <div className="relative">
                    <div 
                      className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-500 hover:scale-110 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (message.user_id !== currentUser.id) {
                          router.push(`/messages?userId=${message.user_id}`);
                        }
                      }}
                      title="انقر لفتح محادثة خاصة"
                    >
                      {message.user_avatar ? (
                        <Image
                          src={getAvatarUrl(message.user_avatar)}
                          alt={message.user_name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                          {message.user_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  {!isOwnMessage && (
                    <span className="text-xs text-gray-900 font-medium mb-1 px-2">{message.user_name}</span>
                  )}
                  
                  <div className="relative group">
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      {message.media_url && message.message_type === 'image' && (
                        <div className="relative w-48 h-48 rounded-lg overflow-hidden mb-2">
                          <Image
                            src={message.media_url}
                            alt="Message image"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words font-medium">{message.content}</p>
                      <span className={`text-xs mt-1 block ${isOwnMessage ? 'text-white/70' : 'text-gray-600'}`}>
                        {formatTime(message.created_at)}
                      </span>
                    </div>

                    {/* Action buttons */}
                    {isOwnMessage ? (
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReportMessage(message)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-all"
                        title="Report inappropriate message"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden">
            <Image src={imagePreview} alt="Preview" fill className="object-cover" />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isSending}
          />

          <button
            onClick={sendMessage}
            disabled={(!newMessage.trim() && !selectedImage) || isSending}
            className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('reports.title')}</h3>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportingMessage(null);
                  setReportReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">{t('reports.message')}</p>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900">{reportingMessage?.content}</p>
                <p className="text-xs text-gray-500 mt-1">{t('reports.from')} {reportingMessage?.user_name}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('reports.reason')}
              </label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={t('reports.reasonPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={4}
              />
            </div>

            <div className="bg-yellow-50 border-r-4 border-yellow-500 p-3 rounded-lg mb-4">
              <p className="text-xs text-yellow-900">
                <strong>{t('common.note')}:</strong> {t('reports.note')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportingMessage(null);
                  setReportReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('reports.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
