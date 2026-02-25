'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Heart, 
  Share2, 
  Loader2, 
  Quote, 
  User, 
  Calendar,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Lock,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';

interface Testimony {
  id: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  content: string;
  religion?: string;
  createdAt: string;
  approvedAt?: string;
  likes: number;
}

interface SecurityInfo {
  vpnDetected: boolean;
  rateLimit?: {
    remaining: number;
    resetTime: string;
  };
}

export default function TestimoniesPage() {
  const toast = useToast();
  const router = useRouter();
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [securityInfo, setSecurityInfo] = useState<SecurityInfo | null>(null);
  const [vpnWarning, setVpnWarning] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      // 1. Security Check: Only logged in users can see this page
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) {
        router.push('/auth/login?callbackUrl=/testimonies');
        return;
      }
      const authData = await authRes.json();
      setUser(authData.user);

      // 2. Fetch Testimonies with Security Checks
      const res = await fetch('/api/testimonies/secure');
      
      if (res.status === 401) {
        router.push('/auth/login?callbackUrl=/testimonies');
        return;
      }

      if (res.status === 403) {
        const data = await res.json();
        setVpnWarning(true);
        toast.show('VPN/Proxy access is not allowed. Please disable it.', 'error');
        return;
      }

      if (res.status === 429) {
        const data = await res.json();
        toast.show(`Too many requests. Please try again in ${data.retryAfter} seconds.`, 'error');
        return;
      }

      const data = await res.json();
      setTestimonies(data.testimonies || []);
      setSecurityInfo(data.security);
    } catch (error) {
      console.error('Error:', error);
      toast.show('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (vpnWarning) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-12 max-w-md shadow-2xl border border-red-100">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-50 rounded-full">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Access Denied</h2>
          <p className="text-gray-600 font-medium text-center mb-8">
            VPN/Proxy connections are not allowed for security reasons. Please disable your VPN and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Loading inspiring stories...</p>
        </div>
      </div>
    );
  }

  const currentTestimony = testimonies[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Security Badge */}
      {securityInfo && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-green-100">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span className="text-xs font-bold text-green-600">Secure Connection</span>
          </div>
        </div>
      )}

      {/* Hero Section - Matching Project Colors (Purple-600 to Blue-500) */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-purple-200" />
            <span className="text-xs font-bold text-purple-100 uppercase tracking-widest">
              Verified Testimonies
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Inspiring Stories
          </h1>

          <p className="text-xl text-white/90 font-medium leading-relaxed max-w-2xl mx-auto">
            Faith journeys full of love and turning back to God showing how Jesus changes lives and gives hope and strength through every challenge
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-20">
        {testimonies.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center shadow-xl border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
              <Quote size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No testimonies yet</h2>
            <p className="text-gray-500 font-medium">Be the first to share your journey with the community.</p>
            <button 
              onClick={() => router.push('/support')}
              className="mt-8 px-8 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
            >
              SHARE YOUR STORY
            </button>
          </div>
        ) : (
          <>
            {/* Featured Testimony */}
            {currentTestimony && (
              <div className="mb-12">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100 relative overflow-hidden">
                  {/* Verified Badge */}
                  <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Verified</span>
                  </div>

                  <Quote className="absolute top-8 left-8 text-purple-50 w-20 h-20 -z-10" />
                  
                  <p className="text-xl md:text-2xl text-gray-800 font-medium leading-relaxed mb-10 italic">
                    "{currentTestimony.content}"
                  </p>

                  <div className="flex items-center justify-between pt-8 border-t border-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                        {currentTestimony.userAvatar ? (
                          <img src={currentTestimony.userAvatar} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          currentTestimony.userName?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{currentTestimony.userName}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(currentTestimony.createdAt)}
                          </p>
                          {currentTestimony.religion && (
                            <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md font-bold">
                              {currentTestimony.religion}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-red-500 transition-all hover:bg-red-50">
                        <Heart size={20} />
                      </button>
                      <button className="p-3 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all">
                        <Share2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mb-12 px-4">
              <button
                onClick={() => setCurrentIndex((prev) => (prev === 0 ? testimonies.length - 1 : prev - 1))}
                className="p-4 bg-white text-purple-600 rounded-xl font-bold shadow-sm hover:shadow-md transition-all border border-gray-100 flex items-center gap-2"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex gap-1.5">
                {testimonies.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentIndex ? 'bg-purple-600 w-8' : 'bg-gray-200 w-1.5 hover:bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentIndex((prev) => (prev === testimonies.length - 1 ? 0 : prev + 1))}
                className="p-4 bg-purple-600 text-white rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                <ArrowRight size={20} />
              </button>
            </div>

            {/* Recent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonies.map((item, idx) => (
                <div 
                  key={item.id} 
                  onClick={() => setCurrentIndex(idx)}
                  className={`bg-white rounded-2xl p-6 shadow-sm border transition-all cursor-pointer hover:shadow-md relative ${
                    idx === currentIndex ? 'border-purple-500 ring-1 ring-purple-500' : 'border-gray-100 hover:border-purple-200'
                  }`}
                >
                  <p className="text-gray-600 text-sm font-medium line-clamp-3 mb-6 italic">"{item.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm">
                      {item.userName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.userName}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer CTA - Matching Project Colors */}
      <div className="max-w-5xl mx-auto px-4 mt-20">
        <div className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-3xl p-12 text-center text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <Sparkles className="w-10 h-10 mx-auto mb-6 text-white/50" />
            <h3 className="text-3xl font-bold mb-4">Your Story Matters</h3>
            <p className="text-white/80 font-medium mb-10 max-w-xl mx-auto">
              Have you experienced a miracle or a life-changing moment? Share it with our community today.
            </p>
            <button 
              onClick={() => router.push('/support')}
              className="px-10 py-4 bg-white text-purple-600 rounded-xl font-bold hover:bg-gray-50 transition-all hover:scale-105 shadow-lg"
            >
              SUBMIT TESTIMONY
            </button>
          </div>
        </div>
      </div>

      {/* Security Info Footer */}
      <div className="max-w-5xl mx-auto px-4 mt-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-gray-500 text-[10px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          <span>Protected by Advanced Security System</span>
        </div>
      </div>
    </div>
  );
}
