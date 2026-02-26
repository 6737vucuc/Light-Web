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
  const t = useTranslations();
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [securityInfo, setSecurityInfo] = useState<SecurityInfo | null>(null);
  const [vpnWarning, setVpnWarning] = useState(false);
  const [liking, setLiking] = useState<number | null>(null);

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
        setVpnWarning(true);
        toast.show(t('vpn.detected'), 'error');
        return;
      }

      if (res.status === 429) {
        const data = await res.json();
        toast.show(`${t('common.error')}. ${t('common.loading')}`, 'error');
        return;
      }

      const data = await res.json();
      setTestimonies(data.testimonies || []);
      setSecurityInfo(data.security);
    } catch (error) {
      console.error('Error:', error);
      toast.show(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id: number) => {
    if (liking === id) return;
    setLiking(id);
    try {
      const res = await fetch(`/api/testimonies/${id}/like`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setTestimonies(prev => prev.map(t => 
          t.id === id ? { ...t, likes: data.likes } : t
        ));
        toast.show(t('common.success'), 'success');
      } else if (res.status === 403) {
        toast.show(t('vpn.detected'), 'error');
      } else if (res.status === 429) {
        toast.show(t('common.error'), 'error');
      } else {
        toast.show(t('common.error'), 'error');
      }
    } catch (error) {
      toast.show(t('common.error'), 'error');
    } finally {
      setLiking(null);
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
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">{t('vpn.warning')}</h2>
          <p className="text-gray-600 font-medium text-center mb-8">
            {t('vpn.detected')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all"
          >
            {t('common.back')}
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
          <p className="text-gray-600 font-bold">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const currentTestimony = testimonies[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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
              {t('testimonies.securityBadge')}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            {t('testimonies.title')}
          </h1>

          <p className="text-xl text-white/90 font-medium leading-relaxed max-w-2xl mx-auto">
            {t('testimonies.subtitle')}
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('testimonies.noTestimonies')}</h2>
            <p className="text-gray-500 font-medium">{t('testimonies.shareYourOwn')}</p>
            <button 
              onClick={() => router.push('/support')}
              className="mt-8 px-8 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
            >
              {t('support.shareTestimony')}
            </button>
          </div>
        ) : (
          <>
            {/* Featured Testimony */}
            {currentTestimony && (
              <div className="mb-12">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100 relative overflow-hidden">
                  {/* Verified Badge - Improved Design */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 bg-green-50 rounded-full border border-green-200 shadow-sm">
                    <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                    <span className="text-[9px] font-bold text-green-700 uppercase tracking-wider">{t('testimonies.verified')}</span>
                  </div>

                  <Quote className="absolute top-8 left-8 text-purple-50 w-20 h-20 -z-10" />
                  
                  <p className="text-xl md:text-2xl text-gray-800 font-medium leading-relaxed mb-10 italic pt-2">
                    "{currentTestimony.content}"
                  </p>

                  <div className="flex items-center justify-between pt-8 border-t border-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0">
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
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleLike(currentTestimony.id)}
                        disabled={liking === currentTestimony.id}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                          liking === currentTestimony.id ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-500 hover:bg-red-100'
                        }`}
                      >
                        {liking === currentTestimony.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart size={20} className={currentTestimony.likes > 0 ? 'fill-current' : ''} />}
                        <span className="font-bold">{currentTestimony.likes}</span>
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

            {/* All Testimonies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
              {testimonies.map((testimony, idx) => (
                <div 
                  key={testimony.id}
                  onClick={() => setCurrentIndex(idx)}
                  className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-purple-200 relative group"
                >
                  {/* Small Verified Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-0.5 px-2 py-0.5 bg-green-50 rounded-full border border-green-200">
                    <CheckCircle className="w-2.5 h-2.5 text-green-600" />
                    <span className="text-[8px] font-bold text-green-700 uppercase">{t('testimonies.verified')}</span>
                  </div>

                  <p className="text-gray-700 font-medium line-clamp-3 mb-4 pt-1">
                    "{testimony.content}"
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        {testimony.userAvatar ? (
                          <img src={testimony.userAvatar} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          testimony.userName?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{testimony.userName}</p>
                        <p className="text-xs text-gray-400">{formatDate(testimony.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-red-500">
                      <Heart size={16} className={testimony.likes > 0 ? 'fill-current' : ''} />
                      <span className="text-sm font-bold">{testimony.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
