'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { BookOpen, Calendar, User, Info, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Lesson {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  religion: string;
  createdAt: string;
}

export default function LessonsPage() {
  const t = useTranslations('lessons');
  const tCommon = useTranslations('common');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [userReligion, setUserReligion] = useState<string | null>(null);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/lessons');
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
        setUserReligion(data.userReligion);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-600 italic">
            {t('subtitle')}
          </p>
        </div>

        {lessons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <BookOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('noLessons')}</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {userReligion === 'none' 
                ? t('setReligion') 
                : "No lessons found for your selected religion yet. Check back later!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 flex flex-col"
                onClick={() => setSelectedLesson(lesson)}
              >
                <div className="relative h-52 w-full bg-gray-100">
                  {lesson.imageUrl ? (
                    <img
                      src={lesson.imageUrl}
                      alt={lesson.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                      }}
                    />
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
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {lesson.title}
                  </h3>
                  <p className="text-gray-600 mb-6 line-clamp-3 text-sm leading-relaxed">
                    {lesson.content}
                  </p>
                  <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 me-1.5" />
                      {new Date(lesson.createdAt).toLocaleDateString()}
                    </div>
                    {lesson.videoUrl && (
                      <div className="flex items-center text-purple-500 font-medium">
                        <span className="h-2 w-2 bg-purple-500 rounded-full animate-pulse me-1.5"></span>
                        Video Included
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lesson Modal */}
        {selectedLesson && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300"
            onClick={() => setSelectedLesson(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 truncate pr-8">
                  {selectedLesson.title}
                </h2>
                <button 
                  onClick={() => setSelectedLesson(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {selectedLesson.videoUrl ? (
                <div className="w-full aspect-video bg-black">
                  <video
                    src={selectedLesson.videoUrl}
                    controls
                    className="w-full h-full"
                    poster={selectedLesson.imageUrl || undefined}
                  />
                </div>
              ) : selectedLesson.imageUrl && (
                <div className="relative w-full">
                  <img
                    src={selectedLesson.imageUrl}
                    alt={selectedLesson.title}
                    className="w-full h-auto max-h-96 object-cover"
                  />
                </div>
              )}

              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <Calendar className="h-4 w-4 me-2 text-purple-500" />
                    {new Date(selectedLesson.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <User className="h-4 w-4 me-2 text-blue-500" />
                    {selectedLesson.religion === 'all' ? 'All Religions' : selectedLesson.religion}
                  </div>
                </div>
                
                <div className="prose prose-purple max-w-none">
                  <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                    {selectedLesson.content}
                  </p>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedLesson(null)}
                    className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
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
