'use client';

import { useEffect, useState } from 'react';

interface OnlineStatusProps {
  userId: number;
  userName: string;
  isOnline?: boolean;
}

export default function OnlineStatus({ userId, userName, isOnline = true }: OnlineStatusProps) {
  const [status, setStatus] = useState(isOnline);

  useEffect(() => {
    setStatus(isOnline);
  }, [isOnline]);

  return (
    <div className="flex items-center gap-2">
      <div className={`relative w-3 h-3 rounded-full ${status ? 'bg-emerald-500' : 'bg-gray-300'}`}>
        {status && (
          <div className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse"></div>
        )}
      </div>
      <span className={`text-xs font-bold uppercase tracking-widest ${
        status ? 'text-emerald-600' : 'text-gray-500'
      }`}>
        {status ? 'متصل الآن' : 'غير متصل'}
      </span>
    </div>
  );
}
