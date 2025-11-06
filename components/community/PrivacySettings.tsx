'use client';

import { useState, useEffect } from 'react';
import { Lock, Globe, Users, Eye, EyeOff, Shield, UserCheck, MessageCircle, Image as ImageIcon, UserPlus } from 'lucide-react';

interface PrivacySettingsProps {
  onClose: () => void;
}

export default function PrivacySettings({ onClose }: PrivacySettingsProps) {
  const [settings, setSettings] = useState({
    privacyPosts: 'public',
    privacyFriendsList: 'public',
    privacyProfile: 'public',
    privacyPhotos: 'public',
    privacyMessages: 'everyone',
    privacyFriendRequests: 'everyone',
    hideOnlineStatus: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/privacy/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/privacy/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Privacy settings saved successfully!');
        onClose();
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      alert('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const PrivacyOption = ({ 
    icon: Icon, 
    title, 
    description, 
    value, 
    onChange, 
    options 
  }: any) => (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Icon className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-900"
          >
            {options.map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Privacy Settings</h2>
                <p className="text-purple-100 text-sm">Control who can see your information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <span className="text-white text-2xl">&times;</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
          <PrivacyOption
            icon={Globe}
            title="Who can see your posts?"
            description="Control who can view your posts on your timeline"
            value={settings.privacyPosts}
            onChange={(value: string) => setSettings({ ...settings, privacyPosts: value })}
            options={[
              { value: 'public', label: '🌍 Public - Everyone' },
              { value: 'friends', label: '👥 Friends Only' },
              { value: 'private', label: '🔒 Only Me' },
            ]}
          />

          <PrivacyOption
            icon={Users}
            title="Who can see your friends list?"
            description="Choose who can view your list of friends"
            value={settings.privacyFriendsList}
            onChange={(value: string) => setSettings({ ...settings, privacyFriendsList: value })}
            options={[
              { value: 'public', label: '🌍 Public - Everyone' },
              { value: 'friends', label: '👥 Friends Only' },
              { value: 'private', label: '🔒 Only Me' },
            ]}
          />

          <PrivacyOption
            icon={UserCheck}
            title="Who can see your profile?"
            description="Control who can view your profile information"
            value={settings.privacyProfile}
            onChange={(value: string) => setSettings({ ...settings, privacyProfile: value })}
            options={[
              { value: 'public', label: '🌍 Public - Everyone' },
              { value: 'friends', label: '👥 Friends Only' },
              { value: 'private', label: '🔒 Only Me' },
            ]}
          />

          <PrivacyOption
            icon={ImageIcon}
            title="Who can see your photos?"
            description="Choose who can view your photos and videos"
            value={settings.privacyPhotos}
            onChange={(value: string) => setSettings({ ...settings, privacyPhotos: value })}
            options={[
              { value: 'public', label: '🌍 Public - Everyone' },
              { value: 'friends', label: '👥 Friends Only' },
              { value: 'private', label: '🔒 Only Me' },
            ]}
          />

          <PrivacyOption
            icon={MessageCircle}
            title="Who can message you?"
            description="Control who can send you private messages"
            value={settings.privacyMessages}
            onChange={(value: string) => setSettings({ ...settings, privacyMessages: value })}
            options={[
              { value: 'everyone', label: '🌍 Everyone' },
              { value: 'friends', label: '👥 Friends Only' },
            ]}
          />

          <PrivacyOption
            icon={UserPlus}
            title="Who can send you friend requests?"
            description="Choose who can send you friend requests"
            value={settings.privacyFriendRequests}
            onChange={(value: string) => setSettings({ ...settings, privacyFriendRequests: value })}
            options={[
              { value: 'everyone', label: '🌍 Everyone' },
              { value: 'friends_of_friends', label: '👥 Friends of Friends' },
            ]}
          />

          {/* Online Status Toggle */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  {settings.hideOnlineStatus ? (
                    <EyeOff className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Eye className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Hide Online Status</h3>
                  <p className="text-sm text-gray-600">
                    Hide when you're online and your last seen time
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hideOnlineStatus}
                  onChange={(e) => setSettings({ ...settings, hideOnlineStatus: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
