'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Image from 'next/image';

interface StoriesProps {
  currentUser: any;
}

export default function Stories({ currentUser }: StoriesProps) {
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 py-5">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-5 overflow-x-auto scrollbar-hide">
          {/* Add Story Button */}
          <div className="flex-shrink-0 text-center cursor-pointer group">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-gray-300 transition-colors">
              {currentUser?.avatar ? (
                <>
                  <Image
                    src={getAvatarUrl(currentUser.avatar)}
                    alt="Your story"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all"></div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-xl">
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                <Plus className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
            </div>
            <p className="text-xs mt-2 font-medium text-gray-700">Your Story</p>
          </div>

          {/* Stories */}
          {stories.map((story) => (
            <div key={story.id} className="flex-shrink-0 text-center cursor-pointer group">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2.5px]">
                  <div className="w-full h-full rounded-full bg-white p-[2.5px]">
                    <div className="relative w-full h-full rounded-full overflow-hidden">
                      {story.user?.avatar ? (
                        <Image
                          src={getAvatarUrl(story.user.avatar)}
                          alt={story.user.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-200"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-lg">
                          {story.user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs mt-2 truncate w-20 text-gray-700 font-medium">
                {story.user?.username || story.user?.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
