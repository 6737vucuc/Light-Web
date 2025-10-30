'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Send, UserPlus, Check, X, Trash2, CheckCheck, MoreVertical, Ban, User, Flag, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface User {
  id: number;
  friendshipId?: number;
  name: string;
  email: string;
  avatar?: string;
  gender?: string;
  country?: string;
  lastSeen?: string;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  readAt?: string;
  isDeleted: boolean;
  deletedBySender: boolean;
  deletedByReceiver: boolean;
  createdAt: string;
}

interface UserProfile {
  id: number;
  name: string;
  avatar?: string;
  gender?: string;
  country?: string;
  lastSeen?: string;
  createdAt: string;
  posts: any[];
}

export default function PrivateMessages() {
  const [activeTab, setActiveTab] = useState<'search' | 'requests' | 'chat'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [longPressMessage, setLongPressMessage] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.user.id);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    fetchFriendRequests().catch(console.error);
    fetchFriends().catch(console.error);
    
    const interval = setInterval(() => {
      fetchFriends().catch(console.error);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages().catch(console.error);
      const interval = setInterval(() => fetchMessages().catch(console.error), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch('/api/friends?type=requests');
      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data.friends || []);
      }
    } catch (error) {
      console.error('Fetch requests error:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends?type=friends');
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Fetch friends error:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId: number) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId }),
      });

      if (response.ok) {
        alert('Friend request sent!');
        setSearchResults(searchResults.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Send request error:', error);
    }
  };

  const handleFriendRequest = async (friendshipId: number, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('/api/friends', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action }),
      });

      if (response.ok) {
        fetchFriendRequests();
        if (action === 'accept') {
          fetchFriends();
        }
      }
    } catch (error) {
      console.error('Handle request error:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedFriend) return;

    try {
      const response = await fetch(`/api/messages/private?friendId=${selectedFriend.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        const unreadMessages = data.messages.filter(
          (m: Message) => !m.isRead && m.receiverId === selectedFriend.id
        );
        
        if (unreadMessages.length > 0) {
          await fetch('/api/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              messageIds: unreadMessages.map((m: Message) => m.id) 
            }),
          });
        }
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend) return;

    try {
      const response = await fetch('/api/messages/private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedFriend.id,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleLongPressStart = (messageId: number) => {
    const timer = setTimeout(() => {
      setLongPressMessage(messageId);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const deleteMessage = async (messageId: number, deleteForEveryone: boolean = false) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteForEveryone }),
      });

      if (response.ok) {
        setLongPressMessage(null);
        fetchMessages();
      }
    } catch (error) {
      console.error('Delete message error:', error);
    }
  };

  const blockUser = async () => {
    if (!selectedFriend) return;

    if (!confirm(`Are you sure you want to block ${selectedFriend.name}?`)) return;

    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedFriend.id }),
      });

      if (response.ok) {
        alert('User blocked successfully');
        setShowUserMenu(false);
        setSelectedFriend(null);
        fetchFriends();
      }
    } catch (error) {
      console.error('Block user error:', error);
      alert('Failed to block user');
    }
  };

  const reportUser = async () => {
    if (!selectedFriend) return;

    const reason = prompt('Please enter the reason for reporting:');
    if (!reason) return;

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: selectedFriend.id,
          reason: reason,
          type: 'user'
        }),
      });

      if (response.ok) {
        alert('User reported successfully. Our team will review it.');
        setShowUserMenu(false);
      } else {
        alert('Failed to report user');
      }
    } catch (error) {
      console.error('Report user error:', error);
      alert('Failed to report user');
    }
  };

  const viewProfile = async () => {
    if (!selectedFriend) return;

    try {
      const response = await fetch(`/api/users/${selectedFriend.id}/profile`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
        setShowProfileModal(true);
        setShowUserMenu(false);
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60;
    return diffMinutes < 5;
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Active now';
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    if (diffDays === 1) return 'Active yesterday';
    if (diffDays < 7) return `Active ${diffDays}d ago`;
    return `Active ${date.toLocaleDateString()}`;
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {!selectedFriend ? (
          <>
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'search'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Search className="w-4 h-4 inline mr-2" />
                Search Friends
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 px-4 py-3 text-sm font-medium relative ${
                  activeTab === 'requests'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Friend Requests
                {friendRequests.length > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {friendRequests.length}
                  </span>
                )}
              </button>
            </div>

            <div className="p-4">
              {activeTab === 'search' && (
                <div>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                      placeholder="Search users..."
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={searchUsers}
                      disabled={loading}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {loading ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-purple-100">
                            {user.avatar ? (
                              <Image
                                src={getAvatarUrl(user.avatar)}
                                alt={user.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-lg">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                        >
                          Add Friend
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="space-y-3">
                  {friendRequests.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No pending friend requests</p>
                  ) : (
                    friendRequests.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-purple-100">
                            {user.avatar ? (
                              <Image
                                src={getAvatarUrl(user.avatar)}
                                alt={user.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-lg">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => user.friendshipId && handleFriendRequest(user.friendshipId, 'accept')}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => user.friendshipId && handleFriendRequest(user.friendshipId, 'reject')}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col h-[600px]">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-500 text-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedFriend(null)}
                  className="p-1 hover:bg-white/20 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/20">
                  {selectedFriend.avatar ? (
                    <Image
                      src={getAvatarUrl(selectedFriend.avatar)}
                      alt={selectedFriend.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold">
                      {selectedFriend.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isOnline(selectedFriend.lastSeen) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{selectedFriend.name}</p>
                  <p className="text-xs text-white/80">{formatLastSeen(selectedFriend.lastSeen)}</p>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-2 hover:bg-white/20 rounded-full"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <button
                        onClick={viewProfile}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        View Profile
                      </button>
                      <button
                        onClick={blockUser}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Ban className="w-4 h-4" />
                        Block User
                      </button>
                      <button
                        onClick={reportUser}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Flag className="w-4 h-4" />
                        Report User
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((message) => {
                const isSender = message.senderId === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                    onMouseDown={() => isSender && handleLongPressStart(message.id)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => isSender && handleLongPressStart(message.id)}
                    onTouchEnd={handleLongPressEnd}
                  >
                    <div className="relative">
                      <div
                        className={`max-w-xs px-4 py-2 rounded-2xl ${
                          isSender
                            ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          isSender ? 'text-white/70' : 'text-gray-500'
                        }`}>
                          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isSender && (
                            message.isRead ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )
                          )}
                        </div>
                      </div>
                      
                      {longPressMessage === message.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setLongPressMessage(null)} />
                          <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[150px]">
                            <button
                              onClick={() => deleteMessage(message.id, false)}
                              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete for me
                            </button>
                            <button
                              onClick={() => deleteMessage(message.id, true)}
                              className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete for everyone
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Friends List */}
      {!selectedFriend && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Friends ({friends.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {friends.map((friend) => (
              <div
                key={friend.id}
                onClick={() => setSelectedFriend(friend)}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-purple-100 flex-shrink-0">
                  {friend.avatar ? (
                    <Image
                      src={getAvatarUrl(friend.avatar)}
                      alt={friend.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-lg">
                      {friend.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isOnline(friend.lastSeen) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{friend.name}</p>
                  <p className="text-xs text-gray-500 truncate">{formatLastSeen(friend.lastSeen)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && userProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">User Profile</h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-purple-100">
                  {userProfile.avatar ? (
                    <Image
                      src={getAvatarUrl(userProfile.avatar)}
                      alt={userProfile.name}
                      width={96}
                      height={96}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-3xl">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{userProfile.name}</h3>
                  <p className="text-gray-600">{userProfile.gender || 'Not specified'}</p>
                  <p className="text-gray-600">{userProfile.country || 'Not specified'}</p>
                  <p className="text-sm text-gray-500">Joined {new Date(userProfile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Recent Posts ({userProfile.posts.length})</h4>
                <div className="space-y-3">
                  {userProfile.posts.slice(0, 3).map((post: any) => (
                    <div key={post.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{post.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {userProfile.posts.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No posts yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
