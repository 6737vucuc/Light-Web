'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Messenger from '@/components/community/Messenger';
import SecurityLoading from '@/components/SecurityLoading';
import { ArrowLeft } from 'lucide-react';

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams?.get('userId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          router.push('/auth/login?redirect=/messages');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/auth/login?redirect=/messages');
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <SecurityLoading />;
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Instagram-style Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Back Button */}
            <button
              onClick={() => router.push('/community')}
              className="hover:scale-110 transition-transform"
            >
              <ArrowLeft className="w-6 h-6 text-gray-800" />
            </button>

            {/* Title */}
            <h1 className="text-lg font-semibold text-gray-900">
              {currentUser?.username || 'Messages'}
            </h1>

            {/* Empty space for balance */}
            <div className="w-6"></div>
          </div>
        </div>
      </div>

      {/* Messenger Component - Full Page */}
      <div className="flex-1 overflow-hidden">
        <MessengerInstagram 
          currentUser={currentUser} 
          initialUserId={userId ? parseInt(userId) : undefined}
          fullPage={true}
        />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<SecurityLoading />}>
      <MessagesContent />
    </Suspense>
  );
}
