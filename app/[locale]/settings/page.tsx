'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, User, Lock, Bell, Eye,
  Ban, Info, LogOut, Check, UserX
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';

interface BlockedUser {
  id: number;
  username: string;
  name: string;
  avatar?: string;
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tProfile = useTranslations('profile');
  const toast = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // Edit Profile States
  const [name, setName] = useState('');
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
    const confirmed = await toast.confirm({
      title: t('unblockUser') || 'Unblock User',
      message: tCommon('confirm'),
      type: 'warning'
    });
    if (!confirmed) return;
    
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
        body: JSON.stringify({ name, bio, avatar }),
      });

      if (response.ok) {
        toast.success(tCommon('success'));
        setActiveSection(null);
        fetchUserData();
      } else {
        toast.error(tCommon('error'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(tCommon('error'));
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
        toast.success(tCommon('success'));
        setActiveSection(null);
        fetchUserData();
      } else {
        toast.error(tCommon('error'));
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
      toast.error(tCommon('error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(tCommon('error'));
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
        toast.success(tCommon('success'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setActiveSection(null);
      } else {
        const data = await response.json();
        toast.error(data.error || tCommon('error'));
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(tCommon('error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await toast.confirm({
      title: t('logout') || 'Logout',
      message: tCommon('confirm'),
      type: 'danger'
    });
    if (confirmed) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        
        // Clear all local storage and session storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear any indexed DB if used
        if (window.indexedDB) {
          const databases = await window.indexedDB.databases();
          databases.forEach(db => {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          });
        }
        
        router.push('/auth/login');
      } catch (error) {
        console.error('Error logging out:', error);
        // Still clear local data even if API call fails
        localStorage.clear();
        sessionStorage.clear();
        router.push('/auth/login');
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
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
              <h1 className="text-base font-semibold">{t('title')}</h1>
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
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="divide-y divide-gray-200">
          {/* Account Section */}
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('account')}</div>
            
            <button
              onClick={() => setActiveSection('edit-profile')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-700" />
                <span className="text-sm">{t('editProfile')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 rtl:rotate-180" />
            </button>

            <button
              onClick={() => setActiveSection('password')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-gray-700" />
                <span className="text-sm">{t('passwordSecurity')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 rtl:rotate-180" />
            </button>
          </div>

          {/* Privacy Section */}
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('privacy')}</div>
            
            <button
              onClick={() => setActiveSection('privacy')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-gray-700" />
                <span className="text-sm">{t('privacySettings')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 rtl:rotate-180" />
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
                <span className="text-sm">{t('blockedUsers')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 rtl:rotate-180" />
            </button>
          </div>

          {/* Notifications Section */}
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('notifications')}</div>
            
            <button
              onClick={() => setActiveSection('notifications')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="text-sm">{t('notificationSettings')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 rtl:rotate-180" />
            </button>
          </div>

          {/* About Section */}
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('about')}</div>
            
            <button
              onClick={() => setActiveSection('about')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-gray-700" />
                <span className="text-sm">{t('aboutApp')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 rtl:rotate-180" />
            </button>
          </div>

          {/* Logout */}
          <div className="py-2">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">{t('logout')}</span>
            </button>
          </div>
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
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
              <h1 className="text-base font-semibold">{t('editProfile')}</h1>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="text-purple-600 font-semibold text-sm disabled:opacity-50"
              >
                {isSaving ? tCommon('loading') : tCommon('save')}
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-2">
              {avatar ? (
                <Image
                  src={avatar.startsWith('data:') ? avatar : getAvatarUrl(avatar)}
                  alt={name}
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
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-purple-600 text-sm font-medium"
            >
              {tProfile('uploadAvatar')}
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tProfile('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>



          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>
        </div>
      </div>
    );
  }

  // Privacy Settings Section
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
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
              <h1 className="text-base font-semibold">{t('privacySettings')}</h1>
              <button
                onClick={handleSavePrivacy}
                disabled={isSaving}
                className="text-purple-600 font-semibold text-sm disabled:opacity-50"
              >
                {isSaving ? tCommon('loading') : tCommon('save')}
              </button>
            </div>
          </div>
        </header>

        <div className="divide-y divide-gray-200">
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{t('privateAccount')}</div>
              <div className="text-xs text-gray-500 mt-1">
                Only approved followers can see your posts
              </div>
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-12 h-7 rounded-full transition-colors ${
                isPrivate ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isPrivate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{t('hideFollowers')}</div>
              <div className="text-xs text-gray-500 mt-1">
                Hide your followers list from others
              </div>
            </div>
            <button
              onClick={() => setHideFollowers(!hideFollowers)}
              className={`w-12 h-7 rounded-full transition-colors ${
                hideFollowers ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  hideFollowers ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{t('hideFollowing')}</div>
              <div className="text-xs text-gray-500 mt-1">
                Hide your following list from others
              </div>
            </div>
            <button
              onClick={() => setHideFollowing(!hideFollowing)}
              className={`w-12 h-7 rounded-full transition-colors ${
                hideFollowing ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  hideFollowing ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
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
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
              <h1 className="text-base font-semibold">{t('passwordSecurity')}</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tProfile('currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {isSaving ? tCommon('loading') : tProfile('changePassword')}
          </button>
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
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
              <h1 className="text-base font-semibold">{t('notificationSettings')}</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>

        <div className="divide-y divide-gray-200">
          <div className="px-4 py-4 flex items-center justify-between">
            <span className="text-sm">{t('likesNotifications')}</span>
            <button
              onClick={() => setLikesNotif(!likesNotif)}
              className={`w-12 h-7 rounded-full transition-colors ${
                likesNotif ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  likesNotif ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="px-4 py-4 flex items-center justify-between">
            <span className="text-sm">{t('commentsNotifications')}</span>
            <button
              onClick={() => setCommentsNotif(!commentsNotif)}
              className={`w-12 h-7 rounded-full transition-colors ${
                commentsNotif ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  commentsNotif ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="px-4 py-4 flex items-center justify-between">
            <span className="text-sm">{t('followsNotifications')}</span>
            <button
              onClick={() => setFollowsNotif(!followsNotif)}
              className={`w-12 h-7 rounded-full transition-colors ${
                followsNotif ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  followsNotif ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="px-4 py-4 flex items-center justify-between">
            <span className="text-sm">{t('messagesNotifications')}</span>
            <button
              onClick={() => setMessagesNotif(!messagesNotif)}
              className={`w-12 h-7 rounded-full transition-colors ${
                messagesNotif ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  messagesNotif ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Blocked Users Section
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
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
              <h1 className="text-base font-semibold">{t('blockedUsers')}</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>

        <div className="divide-y divide-gray-200">
          {blockedUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <UserX className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>{tCommon('noResults')}</p>
            </div>
          ) : (
            blockedUsers.map((user) => (
              <div key={user.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
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
                    <div className="font-medium text-sm">{user.name}</div>
                    <div className="text-xs text-gray-500">@{user.username}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(user.id)}
                  className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
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
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
              <h1 className="text-base font-semibold">{t('aboutApp')}</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>

        <div className="p-6 text-center">
          <div className="relative w-20 h-20 rounded-full overflow-hidden mx-auto mb-4">
            <Image
              src="/logo.png"
              alt="Light of Life"
              fill
              className="object-cover"
            />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Light of Life</h2>
          <p className="text-gray-600 mb-4">Version 1.0.0</p>
          <p className="text-sm text-gray-500">
            A Christian ministry website dedicated to sharing the love and peace of Jesus Christ.
          </p>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Developed with ❤️ by Engineer Anwar
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
