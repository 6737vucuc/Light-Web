'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface Verse {
  id?: number;
  verseText: string;
  verseReference: string;
  imageUrl?: string;
  displayDate?: string;
  language?: string;
}

export default function DailyVerseSection() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDailyVerse();
  }, []);

  const fetchDailyVerse = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/verses/daily');
      if (response.ok) {
        const data = await response.json();
        if (data.verse) {
          setVerse(data.verse);
        }
      }
    } catch (error) {
      console.error('Error fetching daily verse:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('data:')) return imageUrl;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${imageUrl}`;
  };

  if (isLoading || !verse) {
    return null;
  }

  return (
    <section className="w-full py-12 px-4 bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto">
        {verse.imageUrl ? (
          // Verse with Image - Text Overlay
          <div className="relative w-full h-[300px] md:h-[350px] rounded-2xl overflow-hidden shadow-xl">
            <Image
              src={getImageUrl(verse.imageUrl)!}
              alt="Daily Verse"
              fill
              className="object-cover"
              unoptimized
            />
            {/* Dark Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60"></div>
            
            {/* Text Content Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-8">
              <div className="text-center space-y-4 max-w-3xl">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg flex items-center justify-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Daily Verse
                </h3>
                
                {/* Verse Text */}
                <p className="text-base md:text-xl font-serif text-white leading-relaxed drop-shadow-lg italic">
                  "{verse.verseText}"
                </p>
                
                {/* Reference */}
                <p className="text-sm md:text-base font-semibold text-white/90 drop-shadow-md">
                  — {verse.verseReference}
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Verse without Image - Gradient Card
          <div className="relative w-full bg-gradient-to-br from-purple-600 via-blue-500 to-purple-700 rounded-2xl shadow-xl p-8 md:p-10">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              {/* Icon */}
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              
              {/* Title */}
              <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg flex items-center justify-center gap-2">
                <BookOpen className="w-5 h-5" />
                Daily Verse
              </h3>
              
              {/* Verse Text */}
              <p className="text-base md:text-xl font-serif text-white leading-relaxed max-w-3xl italic">
                "{verse.verseText}"
              </p>
              
              {/* Reference */}
              <p className="text-sm md:text-base font-semibold text-white/90">
                — {verse.verseReference}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
