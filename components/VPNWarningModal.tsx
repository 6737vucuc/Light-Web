'use client';

import { useEffect, useState } from 'react';
import { X, Shield, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface VPNWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  detection: {
    isVPN: boolean;
    isTor: boolean;
    isProxy: boolean;
    riskScore: number;
    threatLevel: string;
  };
}

export default function VPNWarningModal({ isOpen, onClose, detection }: VPNWarningModalProps) {
  const [show, setShow] = useState(false);
  const t = useTranslations('vpn');

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    }
  }, [isOpen]);

  if (!show) return null;

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full transform transition-all duration-300 ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl relative">
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-full">
              <AlertTriangle className="w-12 h-12" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center">{t('warning')}</h2>
          <p className="text-center text-red-100 mt-2">{t('detected')}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Detection Info */}
          <div className="bg-red-50 border-r-4 border-red-600 p-4 rounded-lg">
            <p className="text-red-900 font-semibold mb-2">
              ⚠️ {t('detectedUsing')}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {detection.isVPN && (
                <span className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full">
                  VPN
                </span>
              )}
              {detection.isTor && (
                <span className="px-3 py-1 bg-red-700 text-white text-sm font-medium rounded-full">
                  Tor Network
                </span>
              )}
              {detection.isProxy && (
                <span className="px-3 py-1 bg-orange-600 text-white text-sm font-medium rounded-full">
                  Proxy Server
                </span>
              )}
            </div>
          </div>

          {/* Why VPN is blocked */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              {t('whyBlocked')}
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>{t('reason1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>{t('reason2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>{t('reason3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>{t('reason4')}</span>
              </li>
            </ul>
          </div>

          {/* What to do */}
          <div className="bg-green-50 border-r-4 border-green-600 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-green-900 mb-3">✅ {t('whatToDo')}</h3>
            <ol className="space-y-2 text-green-900 list-decimal list-inside">
              <li>{t('step1')}</li>
              <li>{t('step2')}</li>
              <li>{t('step3')}</li>
            </ol>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 rounded-lg">
            <p className="text-yellow-900 text-sm">
              <strong>⚠️</strong> {t('warningNote')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
            >
              {t('understood')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
