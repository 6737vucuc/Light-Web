'use client';

import { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Calendar, 
  User, 
  X, 
  CheckCircle, 
  Star, 
  Loader2, 
  Search, 
  Clock, 
  ChevronRight, 
  PlayCircle,
  Trophy,
  Layout
} from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

        const lessonsWithProgress = (data.lessons || []).map((l: any) => ({
          ...l,
          imageUrl: l.imageUrl || l.imageurl,
          videoUrl: l.videoUrl || l.videourl,
          createdAt: l.createdAt || l.createdat,
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin mx-auto"></div>
            <BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-purple-600" />
          </div>
          <p className="mt-6 text-gray-500 font-medium animate-pulse">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         lesson.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const completedCount = lessons.filter(l => l.completed).length;
  const progressPercentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-100 pt-16 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold uppercase tracking-wider mb-2">
                <Layout className="h-3 w-3 mr-1.5" />
                Learning Center
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                {t('title')}
              </h1>
              <p className="text-lg text-gray-500 max-w-2xl font-medium">
                {t('subtitle')}
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-bold uppercase">Progress</div>
                  <div className="text-lg font-black text-gray-900">{progressPercentage}%</div>
                </div>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-bold uppercase">Lessons</div>
                  <div className="text-lg font-black text-gray-900">{lessons.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {/* Search & Filter Bar */}
        <div className="mb-10 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
            <input
              type="text"
              placeholder="Search for topics, titles, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all shadow-sm text-gray-700 font-medium"
            />
          </div>
        </div>

        {/* Progress Bar (Detailed) */}
        {lessons.length > 0 && (
          <div className="mb-12 bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[2rem] shadow-xl shadow-purple-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Trophy className="h-32 w-32 text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-2xl font-black text-white mb-1">Your Journey</h3>
                  <p className="text-purple-100 font-medium">Keep going! You're doing great.</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-white">{progressPercentage}%</span>
                  <div className="text-purple-200 text-xs font-bold uppercase tracking-widest">Completed</div>
                </div>
              </div>
              <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full bg-white transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="mt-6 flex items-center gap-2 text-white/80 text-sm font-bold">
                <CheckCircle className="h-4 w-4" />
                <span>{completedCount} of {lessons.length} lessons mastered</span>
              </div>
            </div>
          </div>
        )}

        {filteredLessons.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2rem] shadow-sm border border-gray-100">
            <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">{t('noLessons')}</h3>
            <p className="text-gray-500 max-w-md mx-auto font-medium">
              {userReligion === 'none' ? t('setReligion') : "We couldn't find any lessons matching your search. Try different keywords."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="group bg-white rounded-[2rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer border border-gray-100 flex flex-col relative overflow-hidden"
                onClick={() => {
                  setSelectedLesson(lesson);
                  setRating(0);
                }}
              >
                {/* Image Container */}
                <div className="relative h-64 w-full overflow-hidden bg-gray-100">
                  {lesson.imageUrl ? (
                    <img 
                      src={lesson.imageUrl} 
                      alt={lesson.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
                      <BookOpen className="h-16 w-16 text-purple-200" />
                    </div>
                  )}
                  
                  {/* Overlay Badges */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-full shadow-xl transform scale-50 group-hover:scale-100 transition-transform duration-500">
                      <PlayCircle className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>

                  <div className="absolute top-6 left-6 flex gap-2">
                    {lesson.completed && (
                      <div className="bg-green-500 text-white px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Done
                      </div>
                    )}
                    <div className="bg-white/90 backdrop-blur-md text-purple-600 px-3 py-1.5 rounded-xl shadow-lg text-xs font-black uppercase tracking-wider">
                      {lesson.religion === 'all' ? 'Universal' : lesson.religion}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(lesson.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  
                  <h3 className="text-2xl font-black text-gray-900 mb-4 line-clamp-2 group-hover:text-purple-600 transition-colors leading-tight">
                    {lesson.title}
                  </h3>
                  
                  <p className="text-gray-500 mb-8 line-clamp-3 text-base font-medium leading-relaxed">
                    {lesson.content}
                  </p>
                  
                  <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                        <User className="h-4 w-4 text-purple-500" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Light of Life</span>
                    </div>
                    <div className="flex items-center text-purple-600 font-black text-sm group-hover:translate-x-1 transition-transform">
                      Start Lesson
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lesson Modal */}
        {selectedLesson && (
          <div
            className="fixed inset-0 bg-gray-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300"
            onClick={() => setSelectedLesson(null)}
          >
            <div
              className="bg-white rounded-[2.5rem] max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 truncate max-w-md">{selectedLesson.title}</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-widest">
                      <span>{selectedLesson.religion}</span>
                      <span>•</span>
                      <span>{new Date(selectedLesson.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLesson(null)} 
                  className="h-12 w-12 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group"
                >
                  <X className="h-6 w-6 text-gray-400 group-hover:text-gray-900 transition-colors" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {selectedLesson.videoUrl ? (
                  <div className="w-full aspect-video bg-black relative group">
                    {selectedLesson.videoUrl.includes('youtube.com') || selectedLesson.videoUrl.includes('youtu.be') ? (
                      <iframe 
                        src={`https://www.youtube.com/embed/${selectedLesson.videoUrl.split('v=')[1]?.split('&')[0] || selectedLesson.videoUrl.split('/').pop()}`}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    ) : selectedLesson.videoUrl.includes('vimeo.com') ? (
                      <iframe 
                        src={`https://player.vimeo.com/video/${selectedLesson.videoUrl.split('/').pop()}`}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    ) : (
                      <video src={selectedLesson.videoUrl} controls className="w-full h-full" poster={selectedLesson.imageUrl || undefined} />
                    )}
                  </div>
                ) : selectedLesson.imageUrl && (
                  <div className="w-full relative h-80">
                    <img src={selectedLesson.imageUrl} alt={selectedLesson.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                  </div>
                )}

                <div className="p-10">
                  <div className="prose prose-purple max-w-none mb-12">
                    <p className="text-gray-700 text-xl leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedLesson.content}
                    </p>
                  </div>

                  {/* Rating Section */}
                  <div className="bg-gray-50 rounded-[2rem] p-10 border border-gray-100 text-center">
                    <h4 className="text-sm font-black text-gray-400 mb-6 uppercase tracking-[0.2em]">Rate your experience</h4>
                    <div className="flex justify-center gap-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => handleRate(selectedLesson.id, star)}
                          className="transition-all hover:scale-125 active:scale-90"
                        >
                          <Star
                            className={`h-12 w-12 transition-colors ${
                              (hoverRating || rating) >= star 
                                ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]' 
                                : 'text-gray-200'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="mt-6 text-gray-500 font-bold">
                      {rating > 0 ? "Thanks for your feedback!" : "How helpful was this lesson?"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-10 py-8 border-t border-gray-100 bg-white flex flex-col sm:flex-row gap-4">
                {!selectedLesson.completed ? (
                  <button
                    onClick={() => handleComplete(selectedLesson.id)}
                    disabled={actionLoading}
                    className="flex-1 px-10 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-2xl hover:shadow-2xl hover:shadow-purple-200 transition-all flex items-center justify-center disabled:opacity-50 group"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-6 w-6 mr-3 group-hover:scale-110 transition-transform" /> 
                        Complete Lesson
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex-1 px-10 py-5 bg-green-50 text-green-600 font-black rounded-2xl flex items-center justify-center gap-3 border border-green-100">
                    <Trophy className="h-6 w-6" />
                    Lesson Mastered
                  </div>
                )}
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="px-10 py-5 bg-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-200 transition-all"
                >
                  {tCommon('close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
