'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronLeft, ChevronRight, Heart, Send, MoreVertical, Pause, Play } from 'lucide-react';
import Image from 'next/image';

interface Story {
  id: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: Date;
  viewsCount: number;
  hasViewed: boolean;
}

interface StoryGroup {
  userId: number;
  userName: string;
  userAvatar?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

export default function StoriesPage() {
  const router = useRouter();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (storyGroups.length === 0 || isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentGroupIndex, currentStoryIndex, storyGroups, isPaused]);

  const fetchStories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        
        // Group stories by user
        const grouped: { [key: number]: StoryGroup } = {};
        data.stories?.forEach((story: Story) => {
          if (!grouped[story.userId]) {
            grouped[story.userId] = {
              userId: story.userId,
              userName: story.userName,
              userAvatar: story.userAvatar,
              stories: [],
              hasUnviewed: false,
            };
          }
          grouped[story.userId].stories.push(story);
          if (!story.hasViewed) {
            grouped[story.userId].hasUnviewed = true;
          }
        });

        setStoryGroups(Object.values(grouped));
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    const currentGroup = storyGroups[currentGroupIndex];
    if (!currentGroup) return;

    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      router.back();
    }
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
      const prevGroup = storyGroups[currentGroupIndex - 1];
      setCurrentStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  };

  const markAsViewed = async (storyId: number) => {
    try {
      await fetch(`/api/stories/${storyId}/view`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getMediaUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${url}`;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white">Loading stories...</div>
      </div>
    );
  }

  if (storyGroups.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-white">
        <p className="mb-4">No stories available</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-purple-600 rounded-full"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];

  if (!currentStory) return null;

  // Mark current story as viewed
  if (!currentStory.hasViewed) {
    markAsViewed(currentStory.id);
    currentStory.hasViewed = true;
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {currentGroup.stories.map((_, index) => (
          <div key={index} className="flex-1 h-0.5 bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index < currentStoryIndex ? '100%' : index === currentStoryIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700">
            {currentGroup.userAvatar ? (
              <Image
                src={getAvatarUrl(currentGroup.userAvatar)}
                alt={currentGroup.userName}
                width={40}
                height={40}
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                {currentGroup.userName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{currentGroup.userName}</p>
            <p className="text-gray-300 text-xs">
              {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-white" />
            ) : (
              <Pause className="w-5 h-5 text-white" />
            )}
          </button>
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {currentStory.mediaType === 'image' ? (
          <Image
            src={getMediaUrl(currentStory.mediaUrl)}
            alt="Story"
            fill
            className="object-contain"
            unoptimized
          />
        ) : (
          <video
            src={getMediaUrl(currentStory.mediaUrl)}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
          />
        )}

        {/* Navigation Areas */}
        <div className="absolute inset-0 flex">
          <div className="flex-1" onClick={handlePrevious} />
          <div className="flex-1" onClick={handleNext} />
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-20 left-0 right-0 px-4">
            <p className="text-white text-sm">{currentStory.caption}</p>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2">
        <input
          type="text"
          placeholder="Send message..."
          className="flex-1 bg-transparent border border-white/30 rounded-full px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-white/50"
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        />
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Heart className="w-6 h-6 text-white" />
        </button>
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Send className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
