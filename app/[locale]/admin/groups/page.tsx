'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Trash2, Edit, MessageSquare, Calendar } from 'lucide-react';

export default function AdminGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
    icon: 'users',
  });

  useEffect(() => {
    checkAuth();
    loadGroups();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/auth/login');
        return;
      }
      const data = await response.json();
      if (!data.user.isAdmin) {
        router.push('/community');
      }
    } catch (error) {
      router.push('/auth/login');
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/admin/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      alert('يرجى إدخال اسم المجموعة');
      return;
    }

    try {
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewGroup({ name: '', description: '', color: '#8B5CF6', icon: 'users' });
        loadGroups();
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟ سيتم حذف جميع الرسائل والأعضاء.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/groups?id=${groupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadGroups();
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const colors = [
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Orange', value: '#F97316' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إدارة المجموعات</h1>
              <p className="text-gray-600 mt-1">إنشاء وإدارة مجموعات المجتمع</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              إنشاء مجموعة جديدة
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium">حذف تلقائي للرسائل</p>
            <p className="text-blue-700 text-sm mt-1">
              يتم حذف جميع رسائل المجموعات تلقائياً كل 24 ساعة (منتصف الليل) للحفاظ على خصوصية المستخدمين.
            </p>
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {groups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">لا توجد مجموعات حتى الآن</p>
            <p className="text-gray-400 mt-2">ابدأ بإنشاء مجموعة جديدة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Group Header */}
                <div
                  className="h-24 flex items-center justify-center"
                  style={{ backgroundColor: group.color }}
                >
                  <Users className="w-12 h-12 text-white" />
                </div>

                {/* Group Info */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{group.name}</h3>
                  {group.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{group.description}</p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{group.actual_members_count || 0} عضو</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{group.messages_count || 0} رسالة</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">إنشاء مجموعة جديدة</h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المجموعة *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="مثال: مجموعة الصلاة"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="وصف المجموعة..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اللون
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewGroup({ ...newGroup, color: color.value })}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        newGroup.color === color.value
                          ? 'ring-2 ring-offset-2 ring-gray-900 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateGroup}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                إنشاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
