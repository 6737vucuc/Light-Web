'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, Lock, Unlock, RefreshCw, Clock, Users, TrendingUp, Search, Filter } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';

interface SecurityLog {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  failedLoginAttempts: number;
  lastFailedLogin: string;
  lockedUntil?: string;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  lockedAccounts: number;
  failedAttempts: number;
  totalFailedAttempts: number;
}

export default function SecurityDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    lockedAccounts: 0,
    failedAttempts: 0,
    totalFailedAttempts: 0,
  });
  const [recentLocked, setRecentLocked] = useState<SecurityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSecurityLogs();
    }
  }, [timeRange, statusFilter, isAuthenticated]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.user?.isAdmin) {
          setIsAuthenticated(true);
        } else {
          router.push('/');
        }
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/auth/login');
    }
  };

  const loadSecurityLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/security-logs?timeRange=${timeRange}&status=${statusFilter}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setStats(data.stats || {});
        setRecentLocked(data.recentLocked || []);
      }
    } catch (error) {
      console.error('Error loading security logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const unlockAccount = async (userId: number) => {
    const confirmed = await toast.confirm({
      title: 'Unlock Account',
      message: 'Are you sure you want to unlock this account?',
      type: 'warning'
    });
    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin/security-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success('Account unlocked successfully');
        loadSecurityLogs();
      } else {
        toast.error('Failed to unlock account');
      }
    } catch (error) {
      console.error('Error unlocking account:', error);
      toast.error('Error unlocking account');
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getRemainingTime = (lockedUntil: string) => {
    const remaining = new Date(lockedUntil).getTime() - new Date().getTime();
    const minutes = Math.ceil(remaining / (1000 * 60));
    return minutes > 0 ? `${minutes} min` : 'Expired';
  };

  const filteredLogs = logs.filter(log =>
    log.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
                <p className="text-sm text-gray-500">Monitor failed login attempts and locked accounts</p>
              </div>
            </div>
            <button
              onClick={loadSecurityLogs}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Locked Accounts</p>
                <p className="text-3xl font-bold text-red-600">{stats.lockedAccounts}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Lock className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Failed Attempts</p>
                <p className="text-3xl font-bold text-orange-600">{stats.failedAttempts}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Attempts</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalFailedAttempts}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Locked Accounts Alert */}
        {recentLocked.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Recent Locked Accounts (Last 24h)</h3>
                <div className="space-y-2">
                  {recentLocked.map((log) => (
                    <div key={log.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                          {log.avatar ? (
                            <Image
                              src={getAvatarUrl(log.avatar)}
                              alt={log.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-red-500 text-white text-xs font-bold">
                              {log.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{log.name}</p>
                          <p className="text-xs text-gray-500">{log.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-600">
                            {log.failedLoginAttempts} attempts
                          </p>
                          {log.lockedUntil && (
                            <p className="text-xs text-gray-500">
                              Unlocks in {getRemainingTime(log.lockedUntil)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => unlockAccount(log.id)}
                          className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                          title="Unlock Account"
                        >
                          <Unlock className="w-4 h-4 text-green-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            {/* Time Range */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            >
              <option value="1h">Last 1 Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            >
              <option value="all">All Status</option>
              <option value="locked">Locked Only</option>
              <option value="failed">Failed Attempts</option>
            </select>
          </div>
        </div>

        {/* Security Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mb-3 text-gray-300" />
                <p>No security logs found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Failed Attempts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Failed Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLogs.map((log) => {
                    const isLocked = log.lockedUntil && new Date(log.lockedUntil) > new Date();
                    
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                              {log.avatar ? (
                                <Image
                                  src={getAvatarUrl(log.avatar)}
                                  alt={log.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white font-bold">
                                  {log.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{log.name}</p>
                              <p className="text-sm text-gray-500">{log.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                            log.failedLoginAttempts >= 5
                              ? 'bg-red-100 text-red-800'
                              : log.failedLoginAttempts >= 3
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {log.failedLoginAttempts} attempts
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formatDate(log.lastFailedLogin)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isLocked ? (
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-red-600" />
                              <div>
                                <p className="text-sm font-semibold text-red-600">Locked</p>
                                <p className="text-xs text-gray-500">
                                  {getRemainingTime(log.lockedUntil!)} remaining
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Unlock className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-green-600">Active</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isLocked && (
                            <button
                              onClick={() => unlockAccount(log.id)}
                              className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                            >
                              <Unlock className="w-4 h-4" />
                              Unlock
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
