'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Lock, User, Shield, Trash2, Eye, EyeOff, Calendar, Mail } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';

export default function CommunityProfilePage() {
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const locale = params.locale as string || 'ar';

  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Privacy settings
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showEmail: false,
  });

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      // Get current user
      const currentUserResponse = await fetch('/api/auth/me');
      if (currentUserResponse.ok) {
        const currentUserData = await currentUserResponse.json();
        setCurrentUser(currentUserData.user);
        setIsOwnProfile(currentUserData.user.id === parseInt(userId));
      }

      // Get user info
      const userResponse = await fetch(`/api/users/${userId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        toast.success('تم تغيير كلمة المرور بنجاح');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await response.json();
        toast.error(data.error || 'حدث خطأ أثناء تغيير كلمة المرور');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('حدث خطأ أثناء تغيير كلمة المرور');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await toast.confirm({
      title: 'حذف الحساب',
      message: 'هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه!',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم حذف الحساب بنجاح');
        router.push('/auth/login');
      } else {
        toast.error('حدث خطأ أثناء حذف الحساب');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('حدث خطأ أثناء حذف الحساب');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">المستخدم غير موجود</p>
          <button onClick={() => router.back()} className="mt-4 text-purple-600 hover:text-purple-700">
            العودة
          </button>
        </div>
      </div>
    );
  }

  // If not own profile, show basic info only
  if (!isOwnProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-4 h-16">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">الملف الشخصي</h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border-4 border-purple-200">
                {user.avatar ? (
                  <Image src={getAvatarUrl(user.avatar)} alt={user.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-2xl font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
		              <div className="flex-1">
		                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
		              </div>
		            </div>
			            <div className="mt-8">
			              <button 
			                onClick={() => router.push(`/${locale}/messages?userId=${user.id}`)}
			                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all flex items-center justify-center gap-2"
			              >
			                <Mail className="w-5 h-5" />
			                إرسال رسالة
			              </button>
			            </div>
		          </div>
		        </main>
		      </div>
    );
  }

  // Own profile - show settings
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">الإعدادات</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border-4 border-purple-200">
              {user.avatar ? (
                <Image src={getAvatarUrl(user.avatar)} alt={user.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-2xl font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
	            <div className="flex-1">
	              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
	            </div>
          </div>

          {/* User Details - Read Only */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                <p className="text-gray-900">{user.email || 'غير محدد'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">الجنس</p>
                <p className="text-gray-900">
                  {user.gender === 'male' ? 'ذكر' : user.gender === 'female' ? 'أنثى' : 'غير محدد'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">الديانة</p>
                <p className="text-gray-900">{user.religion || 'غير محدد'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">تاريخ الميلاد</p>
                <p className="text-gray-900">{formatDate(user.date_of_birth)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Options */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Change Password */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="font-semibold text-gray-900">تغيير كلمة المرور</h3>
              <p className="text-sm text-gray-600">تحديث كلمة المرور الخاصة بك</p>
            </div>
          </button>

          {/* Privacy Settings */}
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="font-semibold text-gray-900">إعدادات الخصوصية</h3>
              <p className="text-sm text-gray-600">التحكم في خصوصية حسابك</p>
            </div>
          </button>

          {/* Delete Account */}
          <button
            onClick={handleDeleteAccount}
            className="w-full flex items-center gap-4 p-4 hover:bg-red-50 transition-colors"
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="font-semibold text-red-900">حذف الحساب</h3>
              <p className="text-sm text-red-600">حذف حسابك نهائياً</p>
            </div>
          </button>
        </div>
      </main>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">تغيير كلمة المرور</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الحالية</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handlePasswordChange}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Settings Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">إعدادات الخصوصية</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">ظهور الملف الشخصي</h3>
                  <p className="text-sm text-gray-600">من يمكنه رؤية ملفك الشخصي</p>
                </div>
                <select
                  value={privacySettings.profileVisibility}
                  onChange={(e) => setPrivacySettings({ ...privacySettings, profileVisibility: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="public">الجميع</option>
                  <option value="private">خاص</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">إظهار البريد الإلكتروني</h3>
                  <p className="text-sm text-gray-600">السماح للآخرين برؤية بريدك</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.showEmail}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, showEmail: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
