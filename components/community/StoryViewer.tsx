'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, MoreVertical, Globe, Users, Lock } from 'lucide-react';
import Image from 'next/image';

interface Story {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string | null;
  mediaUrl: string;
  mediaType: string;
  createdAt: string;
  expiresAt: string;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  currentUserId: number;
  onClose: () => void;
  onDelete: (storyId: number) => void;
}

export default function StoryViewer({ stories, initialIndex, currentUserId, onClose, onDelete }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory.userId === currentUserId;

  useEffect(() => {
    setProgress(0);
    
    if (!isPaused) {
      progressInterval.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + 1;
        });
      }, 50); // 5 seconds total (100 * 50ms)
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, isPaused]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      const response = await fetch(`/api/stories?storyId=${currentStory.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete(currentStory.id);
        if (stories.length > 1) {
          if (currentIndex === stories.length - 1) {
            setCurrentIndex(currentIndex - 1);
          }
        } else {
          onClose();
        }
      } else {
        alert('Failed to delete story');
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      alert('Failed to delete story');
    }
  };

  const getAvatarUrl = (avatar: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor(diffMs / 60000);

    if (diffHours >= 1) return `${diffHours}h ago`;
    if (diffMins >= 1) return `${diffMins}m ago`;
    return 'Just now';
  };

  const getTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours >= 1) return `${diffHours}h left`;
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins}m left`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 border-2 border-white">
            <Image
              src={getAvatarUrl(currentStory.userAvatar)}
              alt={currentStory.userName}
              width={40}
              height={40}
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{currentStory.userName}</p>
            <p className="text-white/80 text-xs">
              {getTimeAgo(currentStory.createdAt)} • {getTimeRemaining(currentStory.expiresAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwnStory && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-white" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50">
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-3 text-left text-red-600 hover:bg-gray-50 flex items-center gap-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Story
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const clickPosition = x / rect.width;
          
          if (clickPosition < 0.3) {
            handlePrevious();
          } else if (clickPosition > 0.7) {
            handleNext();
          }
        }}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {currentStory.mediaType === 'image' ? (
          <Image
            src={currentStory.mediaUrl}
            alt="Story"
            fill
            className="object-contain"
            priority
          />
        ) : (
          <video
            src={currentStory.mediaUrl}
            className="max-w-full max-h-full"
            autoPlay
            loop
            playsInline
          />
        )}
      </div>

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  );
}
