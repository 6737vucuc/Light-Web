'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import Image from 'next/image';

interface DailyVerseProps {
  onClose?: () => void;
}

interface Verse {
  id: number;
  verse: string;
  reference: string;
  imageUrl?: string;
  scheduledDate: Date;
}

export default function DailyVerse({ onClose }: DailyVerseProps) {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [isVisible, setIsVisible] = useState(false);
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
          
          // Check if user has seen today's verse
          const lastSeenDate = localStorage.getItem('lastSeenVerseDate');
          const today = new Date().toDateString();
          
          if (lastSeenDate !== today) {
            setIsVisible(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching daily verse:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Mark verse as seen for today
    const today = new Date().toDateString();
    localStorage.setItem('lastSeenVerseDate', today);
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (isLoading || !verse || !isVisible) {
    return null;
  }

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('data:')) return imageUrl;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${imageUrl}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg transition-all"
        >
          <X className="w-6 h-6 text-gray-800" />
        </button>

        {/* Content */}
        <div className="relative">
          {verse.imageUrl ? (
            // Verse with Image - Text Overlay
            <div className="relative w-full h-[500px] md:h-[600px]">
              <Image
                src={getImageUrl(verse.imageUrl)!}
                alt="Daily Verse Background"
                fill
                className="object-cover"
                unoptimized
              />
              {/* Dark Overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60"></div>
              
              {/* Text Content Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-12">
                <div className="text-center space-y-6 max-w-xl">
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div className="p-4 bg-white/20 backdrop-blur-sm rounded-full">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                    Daily Verse
                  </h2>
                  
                  {/* Verse Text */}
                  <p className="text-lg md:text-2xl font-serif text-white leading-relaxed drop-shadow-lg italic">
                    "{verse.verse}"
                  </p>
                  
                  {/* Reference */}
                  <p className="text-base md:text-xl font-semibold text-white/90 drop-shadow-md">
                    — {verse.reference}
                  </p>
                  
                  {/* Close Button (Alternative) */}
                  <button
                    onClick={handleClose}
                    className="mt-6 px-8 py-3 bg-white text-purple-600 font-semibold rounded-full hover:bg-purple-50 transition-colors shadow-lg"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Verse without Image - Gradient Background
            <div className="relative w-full min-h-[500px] bg-gradient-to-br from-purple-600 via-blue-500 to-purple-700 p-8 md:p-12">
              <div className="flex flex-col items-center justify-center min-h-[450px] text-center space-y-6">
                {/* Icon */}
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-full">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                
                {/* Title */}
                <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  Daily Verse
                </h2>
                
                {/* Verse Text */}
                <p className="text-xl md:text-3xl font-serif text-white leading-relaxed max-w-2xl italic">
                  "{verse.verse}"
                </p>
                
                {/* Reference */}
                <p className="text-lg md:text-2xl font-semibold text-white/90">
                  — {verse.reference}
                </p>
                
                {/* Close Button */}
                <button
                  onClick={handleClose}
                  className="mt-8 px-8 py-3 bg-white text-purple-600 font-semibold rounded-full hover:bg-purple-50 transition-colors shadow-lg"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
