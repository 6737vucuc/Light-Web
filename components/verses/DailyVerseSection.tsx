'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Sparkles } from 'lucide-center';
import { BookOpen as BookIcon, Sparkles as SparkleIcon } from 'lucide-react';

interface Verse {
  id?: number;
  content: string;
  reference: string;
  religion?: string;
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
      // Using the new dynamic random verse API
      const response = await fetch('/api/verses/random');
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

  if (isLoading || !verse) {
    return null;
  }

  return (
    <section className="w-full py-12 px-4 bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto">
        <div className="relative w-full bg-white border-2 border-purple-100 rounded-3xl shadow-xl p-8 md:p-12 overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50"></div>

          <div className="relative flex flex-col items-center justify-center text-center space-y-6">
            {/* Icon */}
            <div className="p-4 bg-purple-600 rounded-2xl shadow-lg transform -rotate-3">
              <SparkleIcon className="w-8 h-8 text-white" />
            </div>
            
            {/* Title */}
            <div className="space-y-1">
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center justify-center gap-3">
                <BookIcon className="w-6 h-6 text-purple-600" />
                DAILY VERSE
              </h3>
              <div className="h-1 w-24 bg-gradient-to-r from-purple-600 to-blue-500 mx-auto rounded-full"></div>
            </div>
            
            {/* Verse Text */}
            <div className="relative">
              <span className="absolute -top-6 -left-4 text-6xl text-purple-200 font-serif opacity-50">"</span>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-relaxed italic relative z-10">
                {verse.content}
              </p>
              <span className="absolute -bottom-10 -right-4 text-6xl text-purple-200 font-serif opacity-50">"</span>
            </div>
            
            {/* Reference */}
            <div className="pt-4">
              <p className="text-lg md:text-xl font-black text-purple-700 bg-purple-50 px-6 py-2 rounded-full border border-purple-100 shadow-sm">
                — {verse.reference}
              </p>
            </div>
            
            {/* Religion Tag */}
            {verse.religion && verse.religion !== 'all' && (
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Messege for {verse.religion} community
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
