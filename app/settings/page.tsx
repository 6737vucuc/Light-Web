'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, User, Lock, Bell, Eye,
  Ban, Info, LogOut, Check, UserX
} from 'lucide-react';
import Image from 'next/image';

interface BlockedUser {
  id: number;
  username: string;
  name: string;
  avatar?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // Edit Profile States
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Privacy States
  const [isPrivate, setIsPrivate] = useState(false);
  const [hideFollowers, setHideFollowers] = useState(false);
  const [hideFollowing, setHideFollowing] = useState(false);

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notifications States
  const [likesNotif, setLikesNotif] = useState(true);
  const [commentsNotif, setCommentsNotif] = useState(true);
  const [followsNotif, setFollowsNotif] = useState(true);
  const [messagesNotif, setMessagesNotif] = useState(true);

  // Blocked Users
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setName(data.user.name || '');
        setUsername(data.user.username || '');
        setBio(data.user.bio || '');
        setAvatar(data.user.avatar || '');
        setIsPrivate(data.user.isPrivate || false);
        setHideFollowers(data.user.hideFollowers || false);
        setHideFollowing(data.user.hideFollowing || false);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const response = await fetch('/api/block/list');
      if (response.ok) {
        const data = await response.json();
        setBlockedUsers(data.blockedUsers || []);
      }
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  };

  const handleUnblock = async (userId: number) => {
    if (!confirm('Are you sure you want to unblock this user?')) return;
    
    try {
      const response = await fetch(`/api/block/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        setBlockedUsers(blockedUsers.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/users/update-profile-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, bio, avatar }),
      });

      if (response.ok) {
        alert('Profile updated successfully!');
        setActiveSection(null);
        fetchUserData();
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/privacy/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrivate, hideFollowers, hideFollowing }),
      });

      if (response.ok) {
        alert('Privacy settings updated!');
        setActiveSection(null);
        fetchUserData();
      } else {
        alert('Failed to update privacy settings');
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
      alert('Error updating privacy settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        alert('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setActiveSection(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/auth/login');
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Main Settings List
  if (!activeSection) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="w-full px-4">
            <div className="flex items-center justify-between h-14">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-base font-semibold">Settings</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>

        {/* Profile Preview */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200">
              {currentUser?.avatar ? (
                <Image
                  src={getAvatarUrl(currentUser.avatar)}
                  alt={currentUser.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-xl">
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{currentUser?.name}</div>
              <div className="text-sm text-gray-600">@{currentUser?.username}</div>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="divide-y divide-gray-200">
          {/* Account Section */}
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Account</div>
            
            <button
              onClick={() => setActiveSection('edit-profile')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-700" />
                <span className="text-sm">Edit Profile</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => setActiveSection('password')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-gray-700" />
                <span className="text-sm">Password & Security</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Privacy Section */}
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Privacy</div>
            
            <button
              onClick={() => setActiveSection('privacy')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-gray-700" />
                <span className="text-sm">Account Privacy</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => {
                setActiveSection('blocked');
                fetchBlockedUsers();
              }}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Ban className="w-5 h-5 text-gray-700" />
                <span className="text-sm">Blocked Accounts</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Notifications Section */}
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Notifications</div>
            
            <button
              onClick={() => setActiveSection('notifications')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="text-sm">Push Notifications</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* About Section */}
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">About</div>
            
            <button
              onClick={() => setActiveSection('about')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-gray-700" />
                <span className="text-sm">About Light of Life</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Logout */}
          <div className="py-2">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-red-600"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-semibold">Logout</span>
            </button>
          </div>
        </div>

        {/* Version */}
        <div className="p-4 text-center text-xs text-gray-400">
          Version 1.0.0
        </div>
      </div>
    );
  }

  // Edit Profile Section
  if (activeSection === 'edit-profile') {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="w-full px-4">
            <div className="flex items-center justify-between h-14">
              <button
                onClick={() => setActiveSection(null)}
                className="text-sm text-blue-500 font-semibold"
              >
                Cancel
              </button>
              <h1 className="text-base font-semibold">Edit Profile</h1>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="text-sm text-blue-500 font-semibold disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Done'}
              </button>
            </div>
          </div>
        </header>

        <div className="p-4">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-3">
              {avatar ? (
                <Image
                  src={getAvatarUrl(avatar)}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-2xl">
                  {name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-blue-500 font-semibold"
            >
              Change Profile Photo
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Tell us about yourself"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Privacy Section
  if (activeSection === 'privacy') {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="w-full px-4">
            <div className="flex items-center justify-between h-14">
              <button
                onClick={() => setActiveSection(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-base font-semibold">Account Privacy</h1>
              <button
                onClick={handleSavePrivacy}
                disabled={isSaving}
                className="text-sm text-blue-500 font-semibold disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Private Account */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">Private Account</div>
                <div className="text-xs text-gray-600">
                  When your account is private, only people you approve can see your posts and stories
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Hide Followers */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">Hide Followers</div>
                <div className="text-xs text-gray-600">
                  Hide your followers list from others
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={hideFollowers}
                  onChange={(e) => setHideFollowers(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Hide Following */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">Hide Following</div>
                <div className="text-xs text-gray-600">
                  Hide your following list from others
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={hideFollowing}
                  onChange={(e) => setHideFollowing(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password Section
  if (activeSection === 'password') {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="w-full px-4">
            <div className="flex items-center justify-between h-14">
              <button
                onClick={() => setActiveSection(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-base font-semibold">Change Password</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    );
  }

  // Blocked Accounts Section
  if (activeSection === 'blocked') {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="w-full px-4">
            <div className="flex items-center justify-between h-14">
              <button
                onClick={() => setActiveSection(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-base font-semibold">Blocked Accounts</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>

        <div className="divide-y divide-gray-200">
          {blockedUsers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Blocked Accounts</h3>
              <p className="text-sm text-gray-600">
                When you block someone, they won't be able to find your profile or see your posts
              </p>
            </div>
          ) : (
            blockedUsers.map((user) => (
              <div key={user.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                    {user.avatar ? (
                      <Image
                        src={getAvatarUrl(user.avatar)}
                        alt={user.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{user.name}</div>
                    <div className="text-xs text-gray-600">@{user.username}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(user.id)}
                  className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold transition-colors"
                >
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Notifications Section
  if (activeSection === 'notifications') {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="w-full px-4">
            <div className="flex items-center justify-between h-14">
              <button
                onClick={() => setActiveSection(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-base font-semibold">Push Notifications</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">Likes</div>
                <div className="text-xs text-gray-600">Get notified when someone likes your post</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={likesNotif}
                  onChange={(e) => setLikesNotif(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">Comments</div>
                <div className="text-xs text-gray-600">Get notified when someone comments on your post</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={commentsNotif}
                  onChange={(e) => setCommentsNotif(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">New Followers</div>
                <div className="text-xs text-gray-600">Get notified when someone follows you</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={followsNotif}
                  onChange={(e) => setFollowsNotif(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">Messages</div>
                <div className="text-xs text-gray-600">Get notified when you receive a new message</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={messagesNotif}
                  onChange={(e) => setMessagesNotif(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // About Section
  if (activeSection === 'about') {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="w-full px-4">
            <div className="flex items-center justify-between h-14">
              <button
                onClick={() => setActiveSection(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-base font-semibold">About</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-4xl">✨</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Light of Life</h2>
            <p className="text-sm text-gray-600">Version 1.0.0</p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-sm text-gray-700">
            {/* Title */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                In Him Was Life, and That Life Was the Light of All Mankind
              </h3>
              <p className="text-sm italic text-gray-600">
                "The light shines in the darkness, and the darkness has not overcome it." — John 1:5
              </p>
            </div>

            {/* Our Foundation */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Our Foundation</h4>
              <p className="leading-relaxed">
                Light of Life is a sacred digital sanctuary where the Body of Christ gathers, united by one eternal truth: <strong>Jesus Christ is the Light of the World</strong>, and in His light, we find life abundant.
              </p>
              <p className="leading-relaxed mt-2">
                We are called to be bearers of His light—to shine in the darkness, to proclaim His love, and to walk together as one family under the cross.
              </p>
            </div>

            {/* The Transforming Power */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">The Transforming Power of Christ</h4>
              <p className="leading-relaxed mb-3">
                Throughout the ages, the Gospel has transformed hearts and nations. Today, we witness the same divine power:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span><strong>Captives set free</strong> — Chains of sin and addiction broken by His grace</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span><strong>The brokenhearted healed</strong> — Wounds of the past restored by His love</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span><strong>The fearful made bold</strong> — Courage flowing from faith in the Risen Lord</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span><strong>The lost finding home</strong> — Souls discovering their purpose in Christ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span><strong>The lonely embraced</strong> — Finding family in the communion of saints</span>
                </li>
              </ul>
              <p className="leading-relaxed mt-3">
                This is not our work, but <strong>His</strong>—the work of the Holy Spirit moving among His people.
              </p>
            </div>

            {/* What We Hold Sacred */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">What We Hold Sacred</h4>
              <div className="space-y-2">
                <p>✝️ <strong>Christ the Redeemer</strong> — Our salvation, our hope, our eternal light</p>
                <p>📖 <strong>The Holy Scriptures</strong> — The living Word that guides and sanctifies</p>
                <p>🙏 <strong>The Power of Prayer</strong> — Our lifeline to the Father's throne</p>
                <p>❤️ <strong>Agape Love</strong> — The selfless love that reflects Christ's sacrifice</p>
                <p>🕊️ <strong>The Holy Spirit</strong> — Our Comforter, Teacher, and Guide</p>
                <p>⛪ <strong>The Church Universal</strong> — One Body, many members, united in faith</p>
              </div>
            </div>

            {/* Our Sacred Mission */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Our Sacred Mission</h4>
              <p className="leading-relaxed mb-3">
                To create a <strong>global communion of believers</strong> where:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>The Gospel is proclaimed with boldness and grace</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Disciples are made and nurtured in the faith</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>The weary find rest in Christ's presence</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>The broken experience healing through prayer</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>The lost encounter the Savior's love</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Every testimony magnifies the name of Jesus</span>
                </li>
              </ul>
              <p className="leading-relaxed mt-3">
                We exist to <strong>extend the Kingdom of God</strong> in the digital age, making disciples of all nations, teaching them to observe all that Christ commanded.
              </p>
            </div>

            {/* A Community of Faith */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">A Community of Faith</h4>
              <p className="leading-relaxed mb-3">Here, you will discover:</p>
              <div className="space-y-2">
                <p>🌟 <strong>Fellowship in Truth</strong> — Walk alongside believers who share your devotion to Christ</p>
                <p>📖 <strong>Spiritual Formation</strong> — Grow through daily Scripture, teachings, and reflections</p>
                <p>🙏 <strong>Intercessory Prayer</strong> — Join in lifting one another before the throne of grace</p>
                <p>💬 <strong>Edification & Encouragement</strong> — Build each other up in love and truth</p>
                <p>✝️ <strong>Witness & Testimony</strong> — Share how Christ has moved in your life</p>
                <p>❤️ <strong>Christlike Love</strong> — Experience the authentic love of the Body of Christ</p>
              </div>
            </div>

            {/* The Great Commission */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">The Great Commission</h4>
              <p className="italic text-gray-700 leading-relaxed mb-3">
                "Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, teaching them to observe all that I have commanded you. And behold, I am with you always, to the end of the age." — Matthew 28:19-20
              </p>
              <p className="leading-relaxed">
                Light of Life is our response to this divine calling—a digital mission field where the Gospel reaches hearts across borders, languages, and cultures.
              </p>
            </div>

            {/* An Invitation */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">An Invitation to Walk in the Light</h4>
              <p className="leading-relaxed mb-3">
                If you have found your way here, know that <strong>the Lord has led you</strong>.
              </p>
              <p className="leading-relaxed mb-3">
                Perhaps your heart is searching for deeper faith. Perhaps you long for authentic Christian fellowship. Perhaps you simply desire to serve the Kingdom in new ways.
              </p>
              <p className="leading-relaxed mb-3">
                <strong>Whatever your journey, hear this truth:</strong><br />
                You are seen by God. You are loved beyond measure. And you are called to shine His light.
              </p>
              <p className="italic text-gray-600 leading-relaxed">
                "You are the light of the world. A city set on a hill cannot be hidden... Let your light shine before others, that they may see your good deeds and glorify your Father in heaven." — Matthew 5:14, 16
              </p>
            </div>

            {/* Join Us */}
            <div className="text-center bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Join Us in This Sacred Work</h4>
              <p className="leading-relaxed mb-3">Together, we are:</p>
              <div className="space-y-1">
                <p>✨ <strong>Light piercing darkness</strong></p>
                <p>💪 <strong>Strength in weakness, through Christ</strong></p>
                <p>🕊️ <strong>Peace in the midst of storms</strong></p>
                <p>❤️ <strong>Love that never fails</strong></p>
              </div>
              <p className="font-semibold text-purple-700 mt-4 text-lg">
                We are the Body of Christ. We are Light of Life.
              </p>
            </div>

            {/* Blessing */}
            <div className="border-t border-gray-200 pt-6 text-center">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">A Blessing</h4>
              <p className="italic text-gray-700 leading-relaxed">
                "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace." — Numbers 6:24-26
              </p>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 pt-6 border-t border-gray-200">
              <p className="mb-1">© 2025 Light of Life. All rights reserved.</p>
              <p className="text-purple-600 font-semibold">Built in faith, for His glory ✝️❤️</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
