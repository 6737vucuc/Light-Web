'use client';

import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: AlertCircle,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/30 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto animate-slideUp">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-2 sm:p-3 rounded-full ${config.iconBg}`}>
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${config.iconColor}`} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`flex-1 px-4 py-3 text-white rounded-lg font-medium transition-colors text-sm sm:text-base ${config.buttonColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
