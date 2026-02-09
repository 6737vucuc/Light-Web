'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WhatsAppMessenger from '@/components/community/WhatsAppMessenger';
import SecurityLoading from '@/components/SecurityLoading';
import { ArrowLeft, MessageSquare, Shield, Sparkles, Home, User } from 'lucide-react';
import Image from 'next/image';

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
  }, [router]);

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-500 font-bold animate-pulse">Loading Messages...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Redesigned Header matching Community Page */}
      <header className="bg-gradient-to-r from-purple-700 via-purple-600 to-blue-600 shadow-lg py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/community')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white group"
              >
                <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Private Messages</h1>
                  <p className="text-purple-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Secure & Encrypted</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/')} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white hidden md:flex">
                <Home size={20} />
              </button>
              <button
                onClick={() => router.push('/profile?from=community')}
                className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl transition-all hover:scale-105"
              >
                {currentUser?.avatar ? (
                  <Image src={getAvatarUrl(currentUser.avatar)} alt={currentUser.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-sm font-black">
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-0 md:px-4 lg:px-8 py-0 md:py-6">
        <div className="bg-white md:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
          <WhatsAppMessenger 
            currentUser={currentUser} 
            initialUserId={userId ? parseInt(userId) : undefined}
            fullPage={true}
          />
        </div>
      </main>
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
