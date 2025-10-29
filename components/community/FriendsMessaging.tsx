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

export default function FriendsMessaging() {
  const [activeTab, setActiveTab] = useState<'search' | 'requests' | 'friends' | 'chat'>('friends');
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          reason,
        }),
      });

      if (response.ok) {
        alert('Report submitted successfully');
        setShowUserMenu(false);
      }
    } catch (error) {
      console.error('Report user error:', error);
      alert('Failed to submit report');
    }
  };

  const viewProfile = async () => {
    if (!selectedFriend) return;

    try {
      const response = await fetch(`/api/users/${selectedFriend.id}/profile`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
        setShowProfileModal(true);
        setShowUserMenu(false);
      }
    } catch (error) {
      console.error('View profile error:', error);
      alert('Failed to load profile');
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Offline';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Active now';
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Active ${diffDays}d ago`;
  };

  const getAvatarUrl = (avatar?: string) => {
    if (avatar && avatar.startsWith('http')) {
      return avatar;
    }
    return '/logo.png';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
          Search
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
          Requests
          {friendRequests.length > 0 && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {friendRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'friends'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Friends ({friends.length})
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
                          {user.name?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(user.id)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  >
                    <UserPlus className="w-4 h-4 inline mr-1" />
                    Add Friend
                  </button>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && !loading && (
                <p className="text-center text-gray-500 py-8">No users found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-3">
            {friendRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-purple-100">
                    {request.avatar ? (
                      <Image
                        src={getAvatarUrl(request.avatar)}
                        alt={request.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-lg">
                        {request.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-sm text-gray-500">{request.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => request.friendshipId && handleFriendRequest(request.friendshipId, 'accept')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => request.friendshipId && handleFriendRequest(request.friendshipId, 'reject')}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {friendRequests.length === 0 && (
              <p className="text-center text-gray-500 py-8">No friend requests</p>
            )}
          </div>
        )}

        {activeTab === 'friends' && !selectedFriend && (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                onClick={() => {
                  setSelectedFriend(friend);
                  setActiveTab('chat');
                }}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="relative">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-purple-100">
                    {friend.avatar ? (
                      <Image
                        src={getAvatarUrl(friend.avatar)}
                        alt={friend.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-xl">
                        {friend.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  {formatLastSeen(friend.lastSeen) === 'Active now' && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{friend.name}</p>
                  <p className="text-sm text-gray-500">{formatLastSeen(friend.lastSeen)}</p>
                </div>
              </div>
            ))}
            {friends.length === 0 && (
              <p className="text-center text-gray-500 py-8">No friends yet. Start by searching for users!</p>
            )}
          </div>
        )}

        {activeTab === 'chat' && selectedFriend && (
          <div className="flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedFriend(null);
                    setActiveTab('friends');
                  }}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  ←
                </button>
                <div 
                  className="relative cursor-pointer"
                  onClick={viewProfile}
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-purple-100">
                    {selectedFriend.avatar ? (
                      <Image
                        src={getAvatarUrl(selectedFriend.avatar)}
                        alt={selectedFriend.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold">
                        {selectedFriend.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  {formatLastSeen(selectedFriend.lastSeen) === 'Active now' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <p className="font-medium cursor-pointer hover:underline" onClick={viewProfile}>
                    {selectedFriend.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatLastSeen(selectedFriend.lastSeen)}</p>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-10 bg-white shadow-lg rounded-lg border p-2 z-10 min-w-[200px]">
                    <button
                      onClick={viewProfile}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2 text-sm"
                    >
                      <User className="w-4 h-4" />
                      View Profile
                    </button>
                    <button
                      onClick={reportUser}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2 text-sm"
                    >
                      <Flag className="w-4 h-4" />
                      Report
                    </button>
                    <button
                      onClick={blockUser}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 rounded flex items-center gap-2 text-sm text-red-600"
                    >
                      <Ban className="w-4 h-4" />
                      Block User
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {messages.map((message) => {
                const isSent = message.senderId !== selectedFriend.id;
                const isDeleted = message.isDeleted || (isSent ? message.deletedBySender : message.deletedByReceiver);
                
                if (isDeleted) {
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isSent ? 'bg-gray-200' : 'bg-gray-100'} rounded-lg p-3`}>
                        <p className="text-sm text-gray-500 italic">This message was deleted</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'} group relative`}
                  >
                    {!isSent && (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-purple-100 mr-2 flex-shrink-0">
                        {selectedFriend.avatar ? (
                          <Image
                            src={getAvatarUrl(selectedFriend.avatar)}
                            alt={selectedFriend.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-xs">
                            {selectedFriend.name?.[0] || '?'}
                          </div>
                        )}
                      </div>
                    )}
                    <div 
                      className={`max-w-[70%] ${isSent ? 'bg-purple-600 text-white' : 'bg-gray-100'} rounded-2xl px-4 py-2 relative cursor-pointer`}
                      onMouseDown={() => isSent && handleLongPressStart(message.id)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      onTouchStart={() => isSent && handleLongPressStart(message.id)}
                      onTouchEnd={handleLongPressEnd}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <p className={`text-xs ${isSent ? 'text-purple-200' : 'text-gray-500'}`}>
                          {new Date(message.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {isSent && (
                          <span>
                            {message.isRead ? (
                              <CheckCheck className="w-3 h-3 text-blue-300" />
                            ) : (
                              <Check className="w-3 h-3 text-purple-200" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {longPressMessage === message.id && isSent && (
                      <div className="absolute top-0 right-0 bg-white shadow-lg rounded-lg border p-2 z-10 min-w-[200px]">
                        <button
                          onClick={() => deleteMessage(message.id, false)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete for me
                        </button>
                        <button
                          onClick={() => deleteMessage(message.id, true)}
                          className="w-full text-left px-4 py-2 hover:bg-red-50 rounded flex items-center gap-2 text-sm text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete for everyone
                        </button>
                        <button
                          onClick={() => setLongPressMessage(null)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded text-sm text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Aa"
                className="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="w-10 h-10 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && userProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Profile</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-purple-100 mb-4">
                {userProfile.avatar ? (
                  <Image
                    src={getAvatarUrl(userProfile.avatar)}
                    alt={userProfile.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-3xl">
                    {userProfile.name?.[0] || '?'}
                  </div>
                )}
              </div>
              <h4 className="text-2xl font-bold mb-1">{userProfile.name}</h4>
              <p className="text-sm text-gray-500">{formatLastSeen(userProfile.lastSeen)}</p>
            </div>

            <div className="space-y-3 mb-6">
              {userProfile.gender && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Gender</span>
                  <span className="font-medium">{userProfile.gender}</span>
                </div>
              )}
              {userProfile.country && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Country</span>
                  <span className="font-medium">{userProfile.country}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Joined</span>
                <span className="font-medium">
                  {new Date(userProfile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
