'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { BookOpen, Calendar, User } from 'lucide-react';
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

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const response = await fetch('/api/lessons');
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-900" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noLessons')}</h3>
            <p className="mt-1 text-sm text-gray-900">
              {t('setReligion')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedLesson(lesson)}
              >
                {lesson.imageUrl && (
                  <div className="relative h-48 w-full">
                    <Image
                      src={lesson.imageUrl}
                      alt={lesson.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {lesson.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {lesson.content}
                  </p>
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="h-4 w-4 me-1" />
                    {new Date(lesson.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lesson Modal */}
        {selectedLesson && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedLesson(null)}
          >
            <div
              className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedLesson.imageUrl && (
                <div className="relative h-64 w-full">
                  <Image
                    src={selectedLesson.imageUrl}
                    alt={selectedLesson.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              {selectedLesson.videoUrl && (
                <div className="w-full">
                  <video
                    src={selectedLesson.videoUrl}
                    controls
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}
              <div className="p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {selectedLesson.title}
                </h2>
                <div className="flex items-center text-sm text-gray-900 mb-6">
                  <Calendar className="h-4 w-4 me-1" />
                  {new Date(selectedLesson.createdAt).toLocaleDateString()}
                </div>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedLesson.content}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="mt-6 w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-colors"
                >
                  {tCommon('close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
