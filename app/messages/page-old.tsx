'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Messenger from '@/components/community/Messenger';
import SecurityLoading from '@/components/SecurityLoading';

export default function MessagesPage() {
  const router = useRouter();
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
          fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
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
    
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetch('/api/users/update-lastseen', { method: 'POST' }).catch(console.error);
      }
    }, 120000); // 2 minutes (reduced from 30 seconds)

    return () => clearInterval(interval);
  }, [router, isAuthenticated]);

  if (isLoading) {
    return <SecurityLoading />;
  }

  return (
    <div className="h-screen bg-white">
      <Messenger currentUser={currentUser} />
    </div>
  );
}
