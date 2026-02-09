'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, Smartphone, History, Trash2, 
  ChevronLeft, AlertTriangle, CheckCircle, 
  Globe, Clock, LogOut, Loader2 
} from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

export default function SecuritySettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      const res = await fetch('/api/auth/security');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch security data');
    } finally {
      setLoading(false);
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
        setDevices(devices.filter(d => d.id !== id));
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
        router.push('/auth/login');
      }
    } catch (err) {
      toast.error('Failed to perform global logout');
    } finally {
      setIsRevokingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Security & Devices</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        {/* Trusted Devices Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
              <Smartphone className="w-4 h-4 me-2" />
              Trusted Devices
            </h2>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {devices.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No trusted devices found.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {devices.map((device) => (
                  <div key={device.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="bg-slate-100 p-3 rounded-2xl">
                        <Smartphone className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{device.deviceName}</h3>
                        <p className="text-xs text-slate-500 flex items-center mt-1">
                          <Globe className="w-3 h-3 me-1" /> {device.ipAddress} • {device.location || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center mt-1">
                          <Clock className="w-3 h-3 me-1" /> Last used: {new Date(device.lastUsed).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRevokeDevice(device.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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

        {/* Security Logs Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
            <History className="w-4 h-4 me-2" />
            Recent Security Activity
          </h2>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex items-start space-x-4">
                  <div className={`p-2 rounded-full mt-1 ${
                    log.event.includes('success') || log.event.includes('verified') 
                      ? 'bg-green-100 text-green-600' 
                      : log.event.includes('failed') || log.event.includes('locked')
                      ? 'bg-red-100 text-red-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {log.event.includes('success') ? <CheckCircle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        {log.event.replace(/_/g, ' ').toUpperCase()}
                      </h4>
                      <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {log.location || 'Unknown'} • {log.ipAddress || 'No IP'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-8 border-t border-slate-200">
          <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-bold text-red-900">Danger Zone</h2>
            </div>
            <p className="text-sm text-red-700 mb-6">
              If you suspect your account is compromised, you can force a logout from all devices and revoke all trusted sessions.
            </p>
            <button
              onClick={handleLogoutAll}
              disabled={isRevokingAll}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center shadow-lg shadow-red-100"
            >
              {isRevokingAll ? <Loader2 className="w-5 h-5 animate-spin me-2" /> : <LogOut className="w-5 h-5 me-2" />}
              Sign Out from All Devices
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
