'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, User, X } from 'lucide-react';

interface UserAvatarMenuProps {
  userId: number;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export default function UserAvatarMenu({ 
  userId, 
  userName, 
  isOpen, 
  onClose, 
  position 
}: UserAvatarMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleViewProfile = () => {
    router.push(`/community/profile/${userId}`);
    onClose();
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      alert('يرجى إدخال سبب الإبلاغ');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: userId,
          reason: reportReason,
          type: 'user',
        }),
      });

      if (response.ok) {
        alert('تم إرسال البلاغ بنجاح');
        setShowReportModal(false);
        setReportReason('');
        onClose();
      } else {
        alert('حدث خطأ أثناء إرسال البلاغ');
      }
    } catch (error) {
      console.error('Error reporting user:', error);
      alert('حدث خطأ أثناء إرسال البلاغ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px]"
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
        }}
      >
        <div className="px-4 py-2 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">{userName}</p>
        </div>

        <button
          onClick={handleViewProfile}
          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-right"
        >
          <User className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-700">عرض الملف الشخصي</span>
        </button>

        <button
          onClick={() => setShowReportModal(true)}
          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-right"
        >
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">إبلاغ</span>
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">إبلاغ عن {userName}</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سبب الإبلاغ *
              </label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="اشرح سبب الإبلاغ..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                إلغاء
              </button>
              <button
                onClick={handleReport}
                disabled={isSubmitting || !reportReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
