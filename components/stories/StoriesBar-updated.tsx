'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';
import StoryCreator from './StoryCreator';

interface Story {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string | null;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'text';
  caption: string | null;
  backgroundColor: string | null;
  textContent: string | null;
  viewsCount: number;
  createdAt: string;
  expiresAt: string;
  hasViewed: boolean;
}

interface StoryGroup {
  userId: number;
  userName: string;
  userAvatar: string | null;
  stories: Story[];
  hasViewed: boolean;
}

interface StoriesBarProps {
  currentUserId?: number;
}

export default function StoriesBar({ currentUserId }: StoriesBarProps) {
  const toast = useToast();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showAddStory, setShowAddStory] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        setStoryGroups(data.stories || []);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const handlePostStory = async (storyData: any) => {
    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData),
      });

      if (response.ok) {
        toast.success('Story posted successfully!');
        fetchStories();
        setShowAddStory(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to post story');
      }
    } catch (error) {
      console.error('Error posting story:', error);
      toast.error('Failed to post story');
    }
  };

  const getAvatarUrl = (avatar: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getMediaUrl = (url: string) => {
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http')) return url;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${url}`;
  };

  const openStoryViewer = (groupIndex: number) => {
    setCurrentGroupIndex(groupIndex);
    setCurrentStoryIndex(0);
    setShowStoryViewer(true);
  };

  const closeStoryViewer = () => {
    setShowStoryViewer(false);
  };

  const nextStory = () => {
    const currentGroup = storyGroups[currentGroupIndex];
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      closeStoryViewer();
    }
  };

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
      const prevGroup = storyGroups[currentGroupIndex - 1];
      setCurrentStoryIndex(prevGroup.stories.length - 1);
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 py-4 px-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {/* Add Story Button */}
          <button
            onClick={() => setShowAddStory(true)}
            className="flex flex-col items-center gap-2 flex-shrink-0"
          >
            <div className="relative w-16 h-16 rounded-full border-2 border-gray-300 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                <Plus className="w-8 h-8 text-white" />
              </div>
            </div>
            <span className="text-xs text-gray-900 font-medium">Your Story</span>
          </button>

          {/* Story Groups */}
          {storyGroups.map((group, index) => (
            <button
              key={group.userId}
              onClick={() => openStoryViewer(index)}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className={`relative w-16 h-16 rounded-full ${
                group.hasViewed ? 'border-2 border-gray-300' : 'border-2 border-purple-500'
              } overflow-hidden`}>
                <Image
                  src={getAvatarUrl(group.userAvatar)}
                  alt={group.userName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <span className="text-xs text-gray-900 font-medium truncate w-16 text-center">
                {group.userName}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Story Creator Modal */}
      <StoryCreator
        isOpen={showAddStory}
        onClose={() => setShowAddStory(false)}
        onPost={handlePostStory}
      />

      {/* Story Viewer */}
      {showStoryViewer && storyGroups[currentGroupIndex] && (
        <div className="fixed inset-0 z-50 bg-black">
          <button
            onClick={closeStoryViewer}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="h-full flex items-center justify-center">
            <div className="relative w-full h-full max-w-md mx-auto">
              {/* Story Content */}
              {(() => {
                const currentGroup = storyGroups[currentGroupIndex];
                const currentStory = currentGroup.stories[currentStoryIndex];

                if (currentStory.mediaType === 'text') {
                  return (
                    <div
                      className="w-full h-full flex items-center justify-center p-8"
                      style={{ backgroundColor: currentStory.backgroundColor || '#4ECDC4' }}
                    >
                      <p className="text-white text-4xl font-bold text-center">
                        {currentStory.textContent}
                      </p>
                    </div>
                  );
                } else if (currentStory.mediaType === 'image') {
                  return (
                    <Image
                      src={getMediaUrl(currentStory.mediaUrl)}
                      alt="Story"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  );
                } else if (currentStory.mediaType === 'video') {
                  return (
                    <video
                      src={getMediaUrl(currentStory.mediaUrl)}
                      className="w-full h-full object-contain"
                      autoPlay
                      loop
                      muted
                    />
                  );
                }
              })()}

              {/* Navigation Areas */}
              <div className="absolute inset-0 flex">
                <div
                  className="w-1/3 h-full cursor-pointer"
                  onClick={previousStory}
                />
                <div
                  className="w-2/3 h-full cursor-pointer"
                  onClick={nextStory}
                />
              </div>

              {/* Story Info */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center gap-3">
                  <Image
                    src={getAvatarUrl(storyGroups[currentGroupIndex].userAvatar)}
                    alt={storyGroups[currentGroupIndex].userName}
                    width={40}
                    height={40}
                    className="rounded-full"
                    unoptimized
                  />
                  <div>
                    <p className="text-white font-semibold">
                      {storyGroups[currentGroupIndex].userName}
                    </p>
                    <p className="text-white/70 text-sm">
                      {new Date(storyGroups[currentGroupIndex].stories[currentStoryIndex].createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="flex gap-1 mt-3">
                  {storyGroups[currentGroupIndex].stories.map((_, index) => (
                    <div
                      key={index}
                      className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
                    >
                      {index < currentStoryIndex && (
                        <div className="w-full h-full bg-white" />
                      )}
                      {index === currentStoryIndex && (
                        <div className="w-full h-full bg-white animate-progress" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
