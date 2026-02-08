'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, User, X, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('community');
  const tCommon = useTranslations('common');
  const tReports = useTranslations('reports');
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
    // Path matches app/[locale]/community/profile/[userId]/page.tsx
    // The router from '@/i18n/navigation' handles the locale automatically if configured, 
    // but here we ensure it works with the current path structure.
    router.push(`/community/profile/${userId}`);
    onClose();
  };

  const handleSendMessage = () => {
    router.push(`/messages?userId=${userId}`);
    onClose();
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
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
        setShowReportModal(false);
        setReportReason('');
        onClose();
      }
    } catch (error) {
      console.error('Error reporting user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Adjust position to keep menu on screen
  const menuWidth = 220;
  const menuHeight = 180;
  const adjustedX = Math.min(position.x, typeof window !== 'undefined' ? window.innerWidth - menuWidth - 20 : position.x);
  const adjustedY = Math.min(position.y, typeof window !== 'undefined' ? window.innerHeight - menuHeight - 20 : position.y);

  return (
    <>
      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
        style={{
          top: `${adjustedY}px`,
          left: `${adjustedX}px`,
        }}
      >
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-sm font-black text-gray-900 truncate">{userName}</p>
        </div>

        <div className="p-1.5 space-y-1">
          <button
            onClick={handleSendMessage}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 rounded-xl transition-all group"
          >
            <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-gray-700">{t('sendMessage')}</span>
          </button>

          <button
            onClick={handleViewProfile}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-xl transition-all group"
          >
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-gray-700">{t('viewProfile')}</span>
          </button>

          <div className="h-px bg-gray-50 mx-2 my-1" />

          <button
            onClick={() => setShowReportModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-xl transition-all group"
          >
            <div className="p-1.5 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-red-600">{tReports('reportButton')}</span>
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl text-red-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-gray-900">{tReports('title')}</h2>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wider">
                {tReports('reason')}
              </label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={tReports('reasonPlaceholder')}
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-red-500 transition-all font-medium text-gray-900"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleReport}
                disabled={isSubmitting || !reportReason.trim()}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition-all disabled:opacity-50"
              >
                {isSubmitting ? tCommon('loading') : tReports('submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
