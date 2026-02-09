'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Camera, Settings, BookOpen, Lock, User, Mail, Calendar, 
  Users, Heart, CheckCircle, Clock, Award, Eye, EyeOff, ArrowLeft,
  Shield, Smartphone, History, Globe, Trash2, AlertTriangle, Loader2
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  gender: string;
  birthDate: string;
  religion: string;
}

interface LessonProgress {
  id: number;
  lessonId: number;
  completed: boolean;
  progress: number;
  lastAccessedAt: string;
  lessonTitle: string;
}

interface Stats {
  totalLessons: number;
  completed: number;
  inProgress: number;
  completionRate: number;
}

export default function ProfilePage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [stats, setStats] = useState<Stats>({ totalLessons: 0, completed: 0, inProgress: 0, completionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'lessons' | 'settings' | 'security'>('profile');

  const fromCommunity = searchParams.get('from') === 'community';
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Security States
  const [securityData, setSecurityData] = useState<{devices: any[], logs: any[]}>({devices: [], logs: []});
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityData();
    }
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const userResponse = await fetch('/api/auth/me');
      if (!userResponse.ok) {
        router.push('/auth/login');
        return;
      }
      const userData = await userResponse.json();
      setUser(userData.user);

      const progressResponse = await fetch('/api/lessons/progress');
      if (progressResponse.ok) {
        const data = await progressResponse.json();
        setLessonProgress(data.recentProgress || []);
        setStats(data.stats || { totalLessons: 0, completed: 0, inProgress: 0, completionRate: 0 });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityData = async () => {
    setIsSecurityLoading(true);
    try {
      const res = await fetch('/api/auth/security');
      if (res.ok) {
        const data = await res.json();
        setSecurityData(data);
      }
    } catch (err) {
      console.error('Failed to fetch security data');
    } finally {
      setIsSecurityLoading(false);
    }
  };

  const handleRevokeDevice = async (id: number) => {
    const confirmed = await toast.confirm({
      title: 'Revoke Trust',
      message: 'This device will require a verification code next time it tries to log in.',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      const res = await fetch('/api/auth/security', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: id })
      });

      if (res.ok) {
        setSecurityData({
          ...securityData,
          devices: securityData.devices.filter(d => d.id !== id)
        });
        toast.success('Device trust revoked');
      }
    } catch (err) {
      toast.error('Failed to revoke device');
    }
  };

  const handleLogoutAll = async () => {
    const confirmed = await toast.confirm({
      title: 'Logout from all devices?',
      message: 'This will revoke all trusted devices and log you out everywhere. Use this if you suspect unauthorized access.',
      type: 'danger'
    });

    if (!confirmed) return;

    setIsRevokingAll(true);
    try {
      const res = await fetch('/api/auth/logout-all', { method: 'POST' });
      if (res.ok) {
        toast.success('Global logout successful');
        localStorage.clear();
        sessionStorage.clear();
        router.push('/auth/login');
      }
    } catch (err) {
      toast.error('Failed to perform global logout');
    } finally {
      setIsRevokingAll(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const uploadData = await uploadResponse.json();
      const avatarUrl = uploadData.url;

      const updateResponse = await fetch('/api/users/update-profile-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      setUser(prev => prev ? { ...prev, avatar: avatarUrl } : null);
      toast.success('Avatar updated successfully');
    } catch (error: any) {
      console.error('Avatar update error:', error);
      toast.error(error.message || 'An error occurred while updating avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    return avatar;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          {fromCommunity && (
            <button 
              onClick={() => router.push('/community')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 transition-all text-sm"
            >
              <ArrowLeft size={18} />
              Back to Community
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-white p-8 text-center border-b border-gray-100">
            <div className="relative inline-block">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-purple-100 shadow-md">
                <img
                  src={getAvatarUrl(user.avatar)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-4">{user.name}</h2>
            <p className="text-gray-500">{user.email}</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-5 h-5" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('lessons')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'lessons'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                Lessons Progress
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'security'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Shield className="w-5 h-5" />
                Security
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2 text-gray-500">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm font-medium">Email</span>
                    </div>
                    <p className="text-gray-900 font-medium">{user.email}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2 text-gray-500">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Gender</span>
                    </div>
                    <p className="text-gray-900 font-medium capitalize">{user.gender || 'Not specified'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Birth Date</span>
                    </div>
                    <p className="text-gray-900 font-medium">
                      {user.birthDate ? new Date(user.birthDate).toLocaleDateString() : 'Not specified'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2 text-gray-500">
                      <Award className="w-4 h-4" />
                      <span className="text-sm font-medium">Religion</span>
                    </div>
                    <p className="text-gray-900 font-medium">{user.religion || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'lessons' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <p className="text-xs text-purple-600 font-bold uppercase mb-1">Total</p>
                    <p className="text-2xl font-black text-purple-900">{stats.totalLessons}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <p className="text-xs text-green-600 font-bold uppercase mb-1">Completed</p>
                    <p className="text-2xl font-black text-green-900">{stats.completed}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">Progress</p>
                    <p className="text-2xl font-black text-blue-900">{stats.inProgress}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl text-center">
                    <p className="text-xs text-orange-600 font-bold uppercase mb-1">Rate</p>
                    <p className="text-2xl font-black text-orange-900">{stats.completionRate}%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">Recent Lessons</h3>
                  {lessonProgress.length > 0 ? (
                    <div className="space-y-3">
                      {lessonProgress.map((item) => (
                        <div key={item.id} className="p-4 border border-gray-100 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${item.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                              {item.completed ? <CheckCircle size={20} /> : <Clock size={20} />}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{item.lessonTitle}</p>
                              <p className="text-xs text-gray-500">Last accessed: {new Date(item.lastAccessedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black ${item.completed ? 'text-green-600' : 'text-blue-600'}`}>
                              {item.progress}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No lessons started yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-8">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-gray-900">Change Password</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50 shadow-md shadow-purple-200"
                    >
                      {changingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                {/* Trusted Devices */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Smartphone className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider">Trusted Devices</h3>
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                    {isSecurityLoading ? (
                      <div className="p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                      </div>
                    ) : securityData.devices.length === 0 ? (
                      <div className="p-12 text-center">
                        <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">No trusted devices found.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {securityData.devices.map((device) => (
                          <div key={device.id} className="p-5 flex items-center justify-between hover:bg-white transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-white rounded-xl shadow-sm">
                                <Smartphone className="w-6 h-6 text-purple-600" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-gray-900">{device.deviceName}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                  <Globe className="w-3.5 h-3.5" /> {device.location || 'Unknown'} • <Clock className="w-3.5 h-3.5" /> {new Date(device.lastUsed).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRevokeDevice(device.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Revoke Trust"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* Security Activity */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider">Recent Security Activity</h3>
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                    {isSecurityLoading ? (
                      <div className="p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                      </div>
                    ) : securityData.logs.length === 0 ? (
                      <div className="p-12 text-center">
                        <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">No recent security activity.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {securityData.logs.map((log) => (
                          <div key={log.id} className="p-5 flex items-center gap-4 hover:bg-white transition-colors">
                            <div className={`p-2.5 rounded-full ${
                              log.event.includes('success') || log.event.includes('verified') 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-blue-100 text-blue-600'
                            }`}>
                              {log.event.includes('login') ? <User className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-bold text-gray-900">
                                {log.event.replace(/_/g, ' ').toUpperCase()}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {log.ipAddress} • {new Date(log.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* Global Logout */}
                <div className="pt-4">
                  <button
                    onClick={handleLogoutAll}
                    disabled={isRevokingAll}
                    className="w-full p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between hover:bg-red-100 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl group-hover:bg-red-50 shadow-sm">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-black text-red-600">Sign Out from All Devices</div>
                        <div className="text-xs text-red-500 mt-0.5 font-medium">Revoke all trusted sessions immediately</div>
                      </div>
                    </div>
                    {isRevokingAll ? (
                      <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                    ) : (
                      <ChevronRight className="w-6 h-6 text-red-400 rtl:rotate-180" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
