'use client';

import { useEffect, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';

interface IncomingCallPopupProps {
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallPopup({ callerName, onAccept, onReject }: IncomingCallPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);

    // Request notification permission if not granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('مكالمة واردة', {
          body: `${callerName} يتصل بك`,
          icon: '/logo.png',
          tag: 'incoming-call',
          requireInteraction: true
        });
      }
    }
  }, [callerName]);

  const handleAccept = () => {
    setIsVisible(false);
    setTimeout(onAccept, 300);
  };

  const handleReject = () => {
    setIsVisible(false);
    setTimeout(onReject, 300);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleReject}
      />

      {/* Popup */}
      <div 
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 min-w-[320px] max-w-md">
          {/* Animated Phone Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
              <div className="relative bg-green-500 p-6 rounded-full">
                <Phone className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>
          </div>

          {/* Caller Info */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              مكالمة واردة
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {callerName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              يريد إجراء مكالمة صوتية معك
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {/* Reject Button */}
            <button
              onClick={handleReject}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <PhoneOff className="w-5 h-5" />
              رفض
            </button>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 animate-pulse"
            >
              <Phone className="w-5 h-5" />
              قبول
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
