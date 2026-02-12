'use client';

import { useState, useEffect } from 'react';
import { Heart, Share2, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Testimony {
  id: number;
  userName: string;
  content: string;
  createdAt: string;
  likes: number;
}

export default function DailyTestimony() {
  const [testimony, setTestimony] = useState<Testimony | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    loadTestimony();
  }, []);

  const loadTestimony = async () => {
    try {
      const response = await fetch('/api/testimonies');
      if (response.ok) {
        const data = await response.json();
        if (data.testimonies && data.testimonies.length > 0) {
          // Get a random testimony
          const randomIndex = Math.floor(Math.random() * data.testimonies.length);
          setTestimony(data.testimonies[randomIndex]);
        }
      }
    } catch (error) {
      console.error('Error loading testimony:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!testimony) return;
    
    try {
      const response = await fetch(`/api/testimonies/${testimony.id}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        setLiked(!liked);
        setTestimony({
          ...testimony,
          likes: testimony.likes + (liked ? -1 : 1),
        });
      }
    } catch (error) {
      console.error('Error liking testimony:', error);
    }
  };

  const handleShare = () => {
    if (!testimony) return;
    
    const shareText = `"${testimony.content}" - ${testimony.userName}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Inspiring Testimony',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
    }
  };

  if (loading) {
    return (
      <section className="py-12 px-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        </div>
      </section>
    );
  }

  if (!testimony) {
    return null;
  }

  return (
    <section className="py-12 px-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-2xl font-black text-gray-900">Inspiring Testimony</h2>
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-purple-200/50 p-8 md:p-12 border border-purple-100/50 relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-100/30 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-100/30 rounded-full blur-3xl -z-10"></div>

          {/* Quote mark */}
          <div className="text-6xl text-purple-200 font-black mb-4 leading-none">"</div>

          {/* Testimony content */}
          <p className="text-lg md:text-xl text-gray-900 font-bold leading-relaxed mb-8">
            {testimony.content}
          </p>

          {/* Author and actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-8 border-t border-gray-200 gap-4">
            <div>
              <p className="font-black text-gray-900">{testimony.userName}</p>
              <p className="text-sm text-gray-500 font-medium">
                {new Date(testimony.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                  liked
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
                }`}
              >
                <Heart
                  size={18}
                  className={liked ? 'fill-current' : ''}
                />
                <span className="text-sm">{testimony.likes}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-600 rounded-xl font-bold hover:bg-purple-200 transition-all"
              >
                <Share2 size={18} />
              </button>
              <Link
                href="/testimonies"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all whitespace-nowrap ml-auto md:ml-0"
              >
                View All <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
