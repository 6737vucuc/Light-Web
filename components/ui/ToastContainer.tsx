'use client';

import React from 'react';
import { useToast, ToastType } from '@/lib/contexts/ToastContext';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useParams } from 'next/navigation';

interface ToastItemProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
  isRtl: boolean;
}

function ToastItem({ id, message, type, onClose, isRtl }: ToastItemProps) {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const colors = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 ${isRtl ? 'animate-slideInLeft' : 'animate-slideInRight'} min-w-[300px] max-w-md ${bgColors[type]}`}
      role="alert"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className={`flex-shrink-0 ${colors[type]}`}>
        {icons[type]}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${textColors[type]}`}>
          {message}
        </p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 hover:bg-white/50 rounded-full transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const params = useParams();
  const locale = params?.locale as string || 'ar';
  const isRtl = locale === 'ar';

  if (toasts.length === 0) return null;

  return (
    <>
      <div
        className={`fixed top-4 ${isRtl ? 'left-4' : 'right-4'} z-[9999] flex flex-col gap-2 pointer-events-none`}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={removeToast}
              isRtl={isRtl}
            />
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
