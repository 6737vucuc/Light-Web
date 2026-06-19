'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MessagesPage() {
  const router = useRouter();

  useEffect(() => {
    // Private messages have been removed - redirect to community
    router.replace('/community');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcfaff] via-white to-[#f5f3ff] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );
}
