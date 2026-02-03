'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';

interface DailyVerseProps {
  onClose?: () => void;
}

interface Verse {
  id?: number;
  content: string;
  reference: string;
  religion?: string;
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
      const response = await fetch('/api/verses/random');
      if (response.ok) {
        const data = await response.json();
        if (data.verse) {
          setVerse(data.verse);
          
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
    const today = new Date().toDateString();
    localStorage.setItem('lastSeenVerseDate', today);
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (isLoading || !verse || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 md:p-12 text-center border-4 border-purple-100">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-900" />
        </button>

        <div className="flex flex-col items-center space-y-6">
          <div className="p-4 bg-purple-600 rounded-2xl shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-3xl font-black text-gray-900 tracking-tight">DAILY VERSE</h2>
          
          <div className="h-1 w-16 bg-purple-600 rounded-full"></div>

          <p className="text-xl md:text-2xl font-bold text-gray-900 leading-relaxed italic">
            "{verse.content}"
          </p>

          <p className="text-lg font-black text-purple-700 bg-purple-50 px-6 py-2 rounded-full">
            — {verse.reference}
          </p>

          <button
            onClick={handleClose}
            className="mt-4 w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
