'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PrivateMessages from '@/components/community/PrivateMessages';
import SecurityLoading from '@/components/SecurityLoading';

export default function MessagesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          setIsAuthenticated(true);
          fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
          setTimeout(() => {
            setIsLoading(false);
          }, 2000);
        } else {
          router.push('/auth/login?redirect=/messages');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/auth/login?redirect=/messages');
      }
    };

    checkAuth();
    
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [router, isAuthenticated]);

  if (isLoading) {
    return <SecurityLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Messages
          </h1>
          <p className="text-xl text-gray-600">
            Connect with your friends
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <PrivateMessages />
        </div>
      </div>
    </div>
  );
}
