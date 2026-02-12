'use client';

import { useState, useEffect } from 'react';
import { Heart, Share2, MessageCircle, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';

interface Testimony {
  id: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  likes: number;
  liked?: boolean;
}

export default function TestimoniesPage() {
  const toast = useToast();
  const t = useTranslations('testimonies');
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    loadTestimonies();
  }, []);

  const loadTestimonies = async () => {
    try {
      const response = await fetch('/api/testimonies');
      if (response.ok) {
        const data = await response.json();
        setTestimonies(data.testimonies || []);
      }
    } catch (error) {
      console.error('Error loading testimonies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (testimonyId: number) => {
    try {
      const response = await fetch(`/api/testimonies/${testimonyId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        setLiked((prev) => ({
          ...prev,
          [testimonyId]: !prev[testimonyId],
        }));
        
        setTestimonies((prev) =>
          prev.map((t) =>
            t.id === testimonyId
              ? { ...t, likes: t.likes + (liked[testimonyId] ? -1 : 1) }
              : t
          )
        );
      }
    } catch (error) {
      toast.show('Error liking testimony', 'error');
    }
  };

  const handleShare = async (testimony: Testimony) => {
    const shareText = `"${testimony.content}" - ${testimony.userName}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Inspiring Testimony',
          text: shareText,
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      toast.show('Testimony copied to clipboard', 'success');
    }
  };

  const currentTestimony = testimonies[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fcfaff] via-white to-[#f5f3ff] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Loading testimonies...</p>
        </div>
      </div>
    );
  }

  if (testimonies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fcfaff] via-white to-[#f5f3ff] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">No Testimonies Yet</h2>
          <p className="text-gray-600 font-medium mb-6">
            Be the first to share your inspiring testimony with the community!
          </p>
          <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            Share Your Story
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcfaff] via-white to-[#f5f3ff] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              Inspiring Testimonies
            </h1>
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-gray-600 text-lg font-medium max-w-2xl mx-auto">
            Discover stories of faith, hope, and transformation from our community
          </p>
        </div>

        {/* Main Testimony Card */}
        {currentTestimony && (
          <div className="mb-12">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-purple-200/50 p-8 md:p-12 border border-purple-100/50 relative overflow-hidden">
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-purple-100/30 rounded-full blur-3xl -z-10"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-100/30 rounded-full blur-3xl -z-10"></div>

              {/* Quote mark */}
              <div className="text-6xl text-purple-200 font-black mb-4 leading-none">"</div>

              {/* Testimony content */}
              <p className="text-xl md:text-2xl text-gray-900 font-bold leading-relaxed mb-8">
                {currentTestimony.content}
              </p>

              {/* Author info */}
              <div className="flex items-center justify-between pt-8 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-black text-lg">
                    {currentTestimony.userName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{currentTestimony.userName}</p>
                    <p className="text-sm text-gray-500 font-medium">
                      {new Date(currentTestimony.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(currentTestimony.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                      liked[currentTestimony.id]
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
                    }`}
                  >
                    <Heart
                      size={20}
                      className={liked[currentTestimony.id] ? 'fill-current' : ''}
                    />
                    <span className="text-sm">{currentTestimony.likes}</span>
                  </button>
                  <button
                    onClick={() => handleShare(currentTestimony)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-600 rounded-xl font-bold hover:bg-purple-200 transition-all"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mb-12">
          <button
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? testimonies.length - 1 : prev - 1))}
            className="px-6 py-3 bg-white text-purple-600 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all border border-purple-200"
          >
            ← Previous
          </button>

          <div className="text-center">
            <p className="text-gray-600 font-bold">
              {currentIndex + 1} of {testimonies.length}
            </p>
            <div className="flex gap-2 mt-3 justify-center">
              {testimonies.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-purple-600 w-8' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => setCurrentIndex((prev) => (prev === testimonies.length - 1 ? 0 : prev + 1))}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            Next <ArrowRight size={20} />
          </button>
        </div>

        {/* Recent Testimonies Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Recent Testimonies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonies.slice(0, 6).map((testimony) => (
              <div
                key={testimony.id}
                onClick={() => setCurrentIndex(testimonies.indexOf(testimony))}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-100 hover:border-purple-200 group"
              >
                <p className="text-gray-700 font-medium line-clamp-3 mb-4 group-hover:text-purple-600 transition-colors">
                  "{testimony.content}"
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-black text-sm">
                      {testimony.userName?.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{testimony.userName}</p>
                  </div>
                  <Heart
                    size={18}
                    className={`${
                      liked[testimony.id] ? 'fill-red-500 text-red-500' : 'text-gray-400'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-[2.5rem] p-8 md:p-12 text-center shadow-2xl shadow-purple-200/50 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-black text-white mb-4">Share Your Testimony</h3>
            <p className="text-white/80 text-lg font-medium max-w-2xl mx-auto mb-8">
              Your story can inspire others. Share how your faith has transformed your life.
            </p>
            <button className="px-8 py-4 bg-white text-purple-600 rounded-2xl font-black uppercase tracking-wider hover:shadow-xl hover:scale-105 transition-all">
              Share Your Story
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
