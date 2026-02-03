'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { BookOpen, Calendar, User, Info, X, CheckCircle, Star, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';

interface Lesson {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  religion: string;
  createdAt: string;
  completed?: boolean;
}

export default function LessonsPage() {
  const t = useTranslations('lessons');
  const tCommon = useTranslations('common');
  const toast = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [userReligion, setUserReligion] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/lessons');
      const progressResponse = await fetch('/api/lessons/progress');
      
      if (response.ok && progressResponse.ok) {
        const data = await response.json();
        const progressData = await progressResponse.json();
        
        const completedIds = new Set(
          (progressData.recentProgress || [])
            .filter((p: any) => p.completed)
            .map((p: any) => p.lessonId)
        );

        const lessonsWithProgress = (data.lessons || []).map((l: Lesson) => ({
          ...l,
          completed: completedIds.has(l.id)
        }));

        setLessons(lessonsWithProgress);
        setUserReligion(data.userReligion);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (lessonId: number) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/lessons/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, completed: true }),
      });

      if (response.ok) {
        toast.success('Lesson marked as completed!');
        setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, completed: true } : l));
        if (selectedLesson?.id === lessonId) {
          setSelectedLesson(prev => prev ? { ...prev, completed: true } : null);
        }
      }
    } catch (error) {
      toast.error('Failed to update progress');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRate = async (lessonId: number, value: number) => {
    setRating(value);
    try {
      const response = await fetch('/api/lessons/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, rating: value }),
      });
      if (response.ok) {
        toast.success('Thank you for your rating!');
      }
    } catch (error) {
      console.error('Rating error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-xl text-gray-600 italic">{t('subtitle')}</p>
        </div>

        {lessons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <BookOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('noLessons')}</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {userReligion === 'none' ? t('setReligion') : "No lessons found for your selected religion yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 flex flex-col relative"
                onClick={() => {
                  setSelectedLesson(lesson);
                  setRating(0);
                }}
              >
                {lesson.completed && (
                  <div className="absolute top-4 left-4 z-10 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                )}
                <div className="relative h-52 w-full bg-gray-100">
                  {lesson.imageUrl ? (
                    <img src={lesson.imageUrl} alt={lesson.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <BookOpen className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-purple-600 text-xs font-bold rounded-full shadow-sm uppercase">
                      {lesson.religion === 'all' ? 'Universal' : lesson.religion}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">{lesson.title}</h3>
                  <p className="text-gray-600 mb-6 line-clamp-3 text-sm leading-relaxed">{lesson.content}</p>
                  <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 me-1.5" />
                      {new Date(lesson.createdAt).toLocaleDateString()}
                    </div>
                    {lesson.completed ? (
                      <span className="text-green-600 font-bold flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" /> Completed
                      </span>
                    ) : (
                      <span className="text-purple-500 font-medium">Click to Start</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedLesson && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedLesson(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 truncate pr-8">{selectedLesson.title}</h2>
                <button onClick={() => setSelectedLesson(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {selectedLesson.videoUrl ? (
                <div className="w-full aspect-video bg-black">
                  <video src={selectedLesson.videoUrl} controls className="w-full h-full" poster={selectedLesson.imageUrl || undefined} />
                </div>
              ) : selectedLesson.imageUrl && (
                <div className="relative w-full">
                  <img src={selectedLesson.imageUrl} alt={selectedLesson.title} className="w-full h-auto max-h-96 object-cover" />
                </div>
              )}

              <div className="p-8">
                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <Calendar className="h-4 w-4 me-2 text-purple-500" />
                    {new Date(selectedLesson.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <User className="h-4 w-4 me-2 text-blue-500" />
                    {selectedLesson.religion === 'all' ? 'All Religions' : selectedLesson.religion}
                  </div>
                  {selectedLesson.completed && (
                    <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg font-bold">
                      <CheckCircle className="h-4 w-4 me-2" /> Completed
                    </div>
                  )}
                </div>
                
                <div className="prose prose-purple max-w-none mb-10">
                  <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{selectedLesson.content}</p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider text-center">Rate this Lesson</h4>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => handleRate(selectedLesson.id, star)}
                        className="transition-transform hover:scale-125 active:scale-95"
                      >
                        <Star
                          className={`h-10 w-10 ${
                            (hoverRating || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-100">
                  {!selectedLesson.completed && (
                    <button
                      onClick={() => handleComplete(selectedLesson.id)}
                      disabled={actionLoading}
                      className="flex-1 px-8 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle className="h-5 w-5 mr-2" /> Mark as Completed</>}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedLesson(null)}
                    className="px-8 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                  >
                    {tCommon('close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
