'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ShieldCheck, Mail, Smartphone } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = useState('/');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 2FA States
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [twoFactorMessage, setTwoFactorMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setRedirectUrl(params.get('redirect') || '/');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get stored device ID to maintain persistent trust
      const storedDeviceId = localStorage.getItem('device_fingerprint');

      const payload = {
        ...formData,
        twoFactorCode: requires2FA ? twoFactorCode : undefined,
        trustDevice: trustDevice,
        persistentDeviceId: storedDeviceId
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Login failed');
      }

      // Check if 2FA is required
      if (data.requires2FA) {
        setRequires2FA(true);
        setTwoFactorMessage(data.message || 'Verification code sent to your email.');
        setLoading(false);
        return;
      }

      // Successful login
      if (data.deviceId) {
        localStorage.setItem('device_fingerprint', data.deviceId);
      }
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Login error:', err);
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative w-24 h-24 rounded-3xl overflow-hidden shadow-2xl bg-white p-2 border border-slate-200">
            <div className="relative w-full h-full rounded-2xl overflow-hidden">
              <Image src="/logo.png" alt="Logo" fill className="object-cover" priority />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
          {!requires2FA ? (
            <>
              <h1 className="text-3xl font-extrabold text-center mb-2 text-slate-900">
                Welcome Back
              </h1>
              <p className="text-center text-slate-500 mb-8">Secure your account with Internal 2FA</p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full ps-10 pe-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <ShieldCheck className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="w-full ps-10 pe-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={trustDevice}
                      onChange={(e) => setTrustDevice(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Trust this device</span>
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 me-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <div className="bg-purple-100 p-4 rounded-full">
                  <Smartphone className="w-10 h-10 text-purple-600" />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-center mb-2 text-slate-900">
                Verify Identity
              </h1>
              <p className="text-center text-slate-500 mb-8 px-4">
                {twoFactorMessage}
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-4 text-center">
                    Enter 6-digit verification code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-3xl font-bold tracking-[0.5em] text-slate-900 transition-all"
                    placeholder="000000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length !== 6}
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 me-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Complete Sign In'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRequires2FA(false)}
                  className="w-full text-slate-500 text-sm font-semibold hover:text-slate-800 transition-colors"
                >
                  Back to login
                </button>
              </form>
            </>
          )}

<<<<<<< HEAD
            <div className="flex items-center justify-end mb-4">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 me-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
=======
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-600">
              Don't have an account?{' '}
>>>>>>> 98cae3d2ff15d52f43e52465d0dda46a1c404f9b
              <Link
                href="/auth/register"
                className="text-purple-600 hover:text-purple-700 font-bold"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
