'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, User, Lock, Bell, Eye,
  Ban, Info, LogOut, Check, UserX, Shield, Smartphone, History, Globe, Clock, Trash2, AlertTriangle, Loader2
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
  
  // Security Data States
  const [securityData, setSecurityData] = useState<{devices: any[], logs: any[]}>({devices: [], logs: []});
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  
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

  useEffect(() => {
    if (activeSection === 'security') {
      fetchSecurityData();
    }
  }, [activeSection]);

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

  const handleLogout = async () => {
    const confirmed = await toast.confirm({
      title: t('logout') || 'Logout',
      message: tCommon('confirm'),
      type: 'danger'
    });
    if (confirmed) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.clear();
        sessionStorage.clear();
        router.push('/auth/login');
      } catch (error) {
        console.error('Error logging out:', error);
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

  // Security & Devices Section
  if (activeSection === 'security') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="w-full px-4">
            <div className="flex items-center justify-between h-14">
              <button
                onClick={() => setActiveSection(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
              <h1 className="text-base font-semibold">Security & Devices</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Trusted Devices */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-gray-600">
              <Smartphone className="w-5 h-5" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Trusted Devices</h2>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {isSecurityLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                </div>
              ) : securityData.devices.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No trusted devices found.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {securityData.devices.map((device) => (
                    <div key={device.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Smartphone className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{device.deviceName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <Globe className="w-3 h-3" /> {device.location || 'Unknown'} • <Clock className="w-3 h-3" /> {new Date(device.lastUsed).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRevokeDevice(device.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
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
            <div className="flex items-center gap-2 mb-3 text-gray-600">
              <History className="w-5 h-5" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Recent Security Activity</h2>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {isSecurityLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                </div>
              ) : securityData.logs.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No recent activity.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {securityData.logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        log.event.includes('success') || log.event.includes('verified') 
                        ? 'bg-green-50 text-green-600' 
                        : 'bg-blue-50 text-blue-600'
                      }`}>
                        {log.event.includes('login') ? <User className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {log.event.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-500">
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
              className="w-full p-4 bg-white border border-red-100 rounded-xl flex items-center justify-between hover:bg-red-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-red-600">Sign Out from All Devices</div>
                  <div className="text-xs text-gray-500">Revoke all trusted sessions immediately</div>
                </div>
              </div>
              {isRevokingAll ? (
                <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
              ) : (
                <ChevronRight className="w-5 h-5 text-red-400 rtl:rotate-180" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Settings List
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="w-full px-4">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
            </button>
            <h1 className="text-base font-semibold">{t('title')}</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-8">
        {/* Profile Section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Account</h2>
          <div className="space-y-1">
            <button onClick={() => setActiveSection('security')} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Security & Devices</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 rtl:rotate-180" />
            </button>
            <button onClick={handleLogout} className="w-full flex items-center justify-between p-3 hover:bg-red-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-sm font-medium text-red-600">{t('logout')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400 rtl:rotate-180" />
            </button>
          </div>
        </section>

        {/* App Info */}
        <div className="text-center pt-8">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-3 shadow-sm">
            <Image src="/logo.png" alt="Logo" fill className="object-cover" />
          </div>
          <p className="text-xs text-gray-400">Light of Life v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
