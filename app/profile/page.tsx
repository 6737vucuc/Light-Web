'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Loader2, Eye, EyeOff, Save, Shield, Smartphone, Mail, Copy, Check, X } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA states
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState<'authenticator' | 'email'>('email');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        router.push('/auth/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
      setAvatarUrl(data.user.avatar || '');
      setIs2FAEnabled(data.user.twoFactorEnabled || false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload avatar');
      }

      setAvatarUrl(data.avatarUrl);
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEnable2FA = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: twoFAMethod }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enable 2FA');
      }

      if (twoFAMethod === 'authenticator') {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setBackupCodes(data.backupCodes);
      }

      setShow2FAModal(true);
      setSuccess(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          method: twoFAMethod,
          code: verificationCode 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setSuccess('Two-Factor Authentication enabled successfully!');
      setIs2FAEnabled(true);
      setShow2FAModal(false);
      setVerificationCode('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable Two-Factor Authentication?')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      setSuccess('Two-Factor Authentication disabled');
      setIs2FAEnabled(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-6 py-4 border-b-2 font-medium text-sm ${
                  activeTab === 'security'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Security
              </button>
            </nav>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
                {success}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-purple-100 relative">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={user?.name || 'Profile'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-purple-600 text-4xl font-bold">
                          {user?.name?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleAvatarClick}
                      disabled={uploading}
                      className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-gray-900">{user?.name}</h2>
                  <p className="text-gray-500">{user?.email}</p>
                </div>

                {/* Profile Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={user?.name || ''}
                          disabled
                          className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <input
                          type="text"
                          value={user?.gender || 'Not specified'}
                          disabled
                          className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={user?.country || 'Not specified'}
                          disabled
                          className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 italic">
                      Name, Gender, and Country cannot be changed after registration
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Change Password */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Update Password
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Two-Factor Authentication */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Add an extra layer of security to your account by enabling two-factor authentication.
                  </p>

                  {!is2FAEnabled ? (
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <button
                          onClick={() => setTwoFAMethod('email')}
                          className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                            twoFAMethod === 'email'
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <Mail className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                          <p className="font-medium">Email Code</p>
                          <p className="text-xs text-gray-500 mt-1">Receive codes via email</p>
                        </button>
                        <button
                          onClick={() => setTwoFAMethod('authenticator')}
                          className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                            twoFAMethod === 'authenticator'
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <Smartphone className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                          <p className="font-medium">Authenticator App</p>
                          <p className="text-xs text-gray-500 mt-1">Google/Microsoft Authenticator</p>
                        </button>
                      </div>
                      <button
                        onClick={handleEnable2FA}
                        disabled={saving}
                        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            <Shield className="w-5 h-5" />
                            Enable Two-Factor Authentication
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-green-900">2FA is enabled</p>
                            <p className="text-sm text-green-700">Your account is protected</p>
                          </div>
                        </div>
                        <button
                          onClick={handleDisable2FA}
                          disabled={saving}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {saving ? 'Disabling...' : 'Disable'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Setup Two-Factor Authentication</h3>
              <button
                onClick={() => setShow2FAModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {twoFAMethod === 'authenticator' && qrCode && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Scan this QR code with your authenticator app
                  </p>
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  </div>
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Or enter this code manually:</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-sm font-mono">{secret}</code>
                      <button
                        onClick={() => copyToClipboard(secret)}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {backupCodes.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Backup Codes</p>
                    <p className="text-xs text-gray-600 mb-2">
                      Save these codes in a safe place. You can use them to access your account if you lose your device.
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                      {backupCodes.map((code, index) => (
                        <div key={index} className="font-mono text-sm py-1">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {twoFAMethod === 'email' && (
              <div className="text-center py-4">
                <Mail className="w-16 h-16 mx-auto text-purple-600 mb-4" />
                <p className="text-sm text-gray-600">
                  A verification code has been sent to your email address.
                </p>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-2 border rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={handleVerify2FA}
                disabled={saving || !verificationCode}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Verifying...' : 'Verify and Enable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
