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
  ArrowRight
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
  likes: number;
}

export default function TestimoniesPage() {
  const toast = useToast();
  const router = useRouter();
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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

      // 2. Fetch Testimonies
      const res = await fetch('/api/testimonies');
      const data = await res.json();
      setTestimonies(data.testimonies || []);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-700 via-indigo-800 to-blue-900 text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
        </div>

        <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
          Inspiring <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-200">Stories</span>
        </h2>
        <p className="text-xl text-purple-100 font-medium max-w-2xl mx-auto leading-relaxed">
          Faith journeys full of love and turning back to God showing how Jesus changes lives and gives hope and strength through every challenge
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 -mt-10 relative z-20">
        {testimonies.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-20 text-center shadow-xl border-2 border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300">
              <Quote size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">No testimonies yet</h2>
            <p className="text-gray-500 font-medium">Be the first to share your journey with the community.</p>
            <button 
              onClick={() => router.push('/support')}
              className="mt-8 px-8 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
            >
              SHARE YOUR STORY
            </button>
          </div>
        ) : (
          <>
            {/* Featured Testimony */}
            {currentTestimony && (
              <div className="mb-12">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-purple-200/50 p-8 md:p-12 border-2 border-purple-100/50 relative overflow-hidden">
                  <Quote className="absolute top-8 right-12 text-purple-50 w-24 h-24 -z-10" />
                  
                  <p className="text-2xl md:text-3xl text-gray-900 font-bold leading-relaxed mb-10 italic">
                    "{currentTestimony.content}"
                  </p>

                  <div className="flex items-center justify-between pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-2xl shadow-lg border-2 border-white">
                        {currentTestimony.userAvatar ? (
                          <img src={currentTestimony.userAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          currentTestimony.userName?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-xl">{currentTestimony.userName}</p>
                        <p className="text-sm text-gray-500 font-bold flex items-center gap-2">
                          <Calendar size={14} />
                          {formatDate(currentTestimony.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:text-red-500 transition-all border-2 border-transparent hover:border-red-100">
                        <Heart size={24} />
                      </button>
                      <button className="p-4 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-100 transition-all border-2 border-transparent hover:border-purple-200">
                        <Share2 size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mb-16 px-4">
              <button
                onClick={() => setCurrentIndex((prev) => (prev === 0 ? testimonies.length - 1 : prev - 1))}
                className="px-8 py-4 bg-white text-purple-600 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all border-2 border-purple-100 flex items-center gap-2"
              >
                ← PREV
              </button>

              <div className="hidden md:flex gap-2">
                {testimonies.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-3 rounded-full transition-all ${
                      idx === currentIndex ? 'bg-purple-600 w-12' : 'bg-gray-300 w-3 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentIndex((prev) => (prev === testimonies.length - 1 ? 0 : prev + 1))}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                NEXT <ArrowRight size={20} />
              </button>
            </div>

            {/* Recent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonies.map((item, idx) => (
                <div 
                  key={item.id} 
                  onClick={() => setCurrentIndex(idx)}
                  className={`bg-white rounded-3xl p-6 shadow-md border-2 transition-all cursor-pointer hover:scale-[1.02] ${
                    idx === currentIndex ? 'border-purple-500 shadow-purple-100' : 'border-gray-100 hover:border-purple-200'
                  }`}
                >
                  <p className="text-gray-700 font-medium line-clamp-3 mb-6 italic">"{item.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-black text-sm">
                      {item.userName?.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{item.userName}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer CTA */}
      <div className="max-w-5xl mx-auto px-4 mt-20">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-[3rem] p-12 text-center text-white shadow-2xl shadow-purple-200 relative overflow-hidden">
          <div className="relative z-10">
            <Sparkles className="w-12 h-12 mx-auto mb-6 text-purple-200" />
            <h3 className="text-3xl font-black mb-4">Your Story Matters</h3>
            <p className="text-purple-100 font-medium mb-10 max-w-xl mx-auto">
              Have you experienced a miracle or a life-changing moment? Share it with our community today.
            </p>
            <button 
              onClick={() => router.push('/support')}
              className="px-10 py-5 bg-white text-purple-600 rounded-[2rem] font-black uppercase tracking-widest hover:shadow-2xl transition-all hover:scale-105"
            >
              SUBMIT TESTIMONY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
