'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import Image from 'next/image';

interface Story {
  id: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewsCount: number;
  isViewed?: boolean;
}

interface StoriesProps {
  currentUser: any;
}

export default function Stories({ currentUser }: StoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [showViewer, setShowViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stories) {
          setStories(data.stories.map((s: any) => ({
            id: s.id,
            userId: s.userId,
            userName: s.userName,
            userAvatar: s.userAvatar,
            mediaUrl: s.mediaUrl,
            mediaType: s.mediaType,
            caption: s.caption,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            viewsCount: s.viewsCount || 0,
            isViewed: false,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const handleStoryClick = (index: number) => {
    setCurrentStoryIndex(index);
    setShowViewer(true);
  };

  const handleNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      setShowViewer(false);
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {/* Create Story Card */}
          <div
            onClick={() => setShowCreator(true)}
            className="flex-shrink-0 w-28 cursor-pointer group"
          >
            <div className="relative h-44 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl overflow-hidden mb-2 border-2 border-transparent hover:border-purple-500 transition-all">
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 relative">
                  {currentUser?.avatar ? (
                    <Image
                      src={getAvatarUrl(currentUser.avatar)}
                      alt="Your story"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-200 to-blue-200" />
                  )}
                </div>
                <div className="h-12 bg-white flex items-center justify-center relative">
                  <div className="absolute -top-5 w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs font-medium text-center text-gray-900 truncate">Create Story</p>
          </div>

          {/* Stories List */}
          {stories.map((story, index) => (
            <div
              key={story.id}
              onClick={() => handleStoryClick(index)}
              className="flex-shrink-0 w-28 cursor-pointer group"
            >
              <div className={`relative h-44 rounded-xl overflow-hidden mb-2 ${
                story.isViewed 
                  ? 'border-2 border-gray-300' 
                  : 'border-4 border-purple-600 shadow-lg'
              } group-hover:scale-105 transition-transform`}>
                <Image
                  src={story.mediaUrl}
                  alt={story.userName}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
                
                {/* User Avatar */}
                <div className={`absolute top-3 left-3 w-10 h-10 rounded-full overflow-hidden ${
                  story.isViewed 
                    ? 'border-2 border-gray-300' 
                    : 'border-3 border-purple-600'
                } bg-white`}>
                  <Image
                    src={getAvatarUrl(story.userAvatar)}
                    alt={story.userName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* User Name */}
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs font-semibold text-white truncate drop-shadow-lg">
                    {story.userName}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {showViewer && stories[currentStoryIndex] && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={() => setShowViewer(false)}
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-gray-800/50 hover:bg-gray-700/50 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Progress Bars */}
          <div className="absolute top-4 left-4 right-16 z-50 flex gap-1">
            {stories.map((_, index) => (
              <div
                key={index}
                className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden"
              >
                <div
                  className={`h-full bg-white transition-all duration-300 ${
                    index < currentStoryIndex
                      ? 'w-full'
                      : index === currentStoryIndex
                      ? 'w-full animate-progress'
                      : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Story Header */}
          <div className="absolute top-12 left-4 z-50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
              <Image
                src={getAvatarUrl(stories[currentStoryIndex].userAvatar)}
                alt={stories[currentStoryIndex].userName}
                width={40}
                height={40}
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                {stories[currentStoryIndex].userName}
              </p>
              <p className="text-gray-300 text-xs">
                {new Date(stories[currentStoryIndex].createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Navigation Areas */}
          <div
            onClick={handlePrevStory}
            className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-40"
          />
          <div
            onClick={handleNextStory}
            className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-40"
          />

          {/* Story Content */}
          <div className="relative w-full h-full max-w-md mx-auto flex items-center justify-center">
            {stories[currentStoryIndex].mediaType === 'image' ? (
              <Image
                src={stories[currentStoryIndex].mediaUrl}
                alt="Story"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <video
                src={stories[currentStoryIndex].mediaUrl}
                className="w-full h-full object-contain"
                autoPlay
                onEnded={handleNextStory}
              />
            )}

            {/* Caption */}
            {stories[currentStoryIndex].caption && (
              <div className="absolute bottom-20 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                <p className="text-white text-sm">{stories[currentStoryIndex].caption}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Story Creator Modal */}
      {showCreator && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                Create Story
              </h2>
              <button
                onClick={() => setShowCreator(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-gray-700 font-medium mb-1">Add Photo or Video</p>
                <p className="text-gray-500 text-sm">or drag and drop</p>
              </div>

              <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all font-medium shadow-md">
                Share Story
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        .animate-progress {
          animation: progress 5s linear forwards;
        }
      `}</style>
    </>
  );
}
