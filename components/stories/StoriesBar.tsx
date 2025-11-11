'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';

interface Story {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string | null;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string | null;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (showStoryViewer) {
      const timer = setTimeout(() => {
        handleNext();
      }, 5000); // 5 seconds per story

      return () => clearTimeout(timer);
    }
  }, [showStoryViewer, currentGroupIndex, currentStoryIndex]);

  const fetchStories = async () => {
    try {
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        setStoryGroups(data.storyGroups || []);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const handleAddStory = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const { url } = await uploadResponse.json();

      // Create story
      const storyResponse = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: url,
          mediaType: selectedFile.type.startsWith('video/') ? 'video' : 'image',
          caption: caption || null,
        }),
      });

      if (storyResponse.ok) {
        setShowAddStory(false);
        setSelectedFile(null);
        setCaption('');
        fetchStories();
      }
    } catch (error) {
      console.error('Error adding story:', error);
      toast.error('Failed to add story');
    } finally {
      setUploading(false);
    }
  };

  const handleStoryClick = (groupIndex: number) => {
    setCurrentGroupIndex(groupIndex);
    setCurrentStoryIndex(0);
    setShowStoryViewer(true);

    // Mark as viewed
    const story = storyGroups[groupIndex].stories[0];
    markAsViewed(story.id);
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

  const handleNext = () => {
    const currentGroup = storyGroups[currentGroupIndex];
    
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      // Next story in same group
      setCurrentStoryIndex(currentStoryIndex + 1);
      markAsViewed(currentGroup.stories[currentStoryIndex + 1].id);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      // Next group
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStoryIndex(0);
      markAsViewed(storyGroups[currentGroupIndex + 1].stories[0].id);
    } else {
      // End of stories
      setShowStoryViewer(false);
    }
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      // Previous story in same group
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentGroupIndex > 0) {
      // Previous group
      setCurrentGroupIndex(currentGroupIndex - 1);
      const prevGroup = storyGroups[currentGroupIndex - 1];
      setCurrentStoryIndex(prevGroup.stories.length - 1);
    }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const currentStory = storyGroups[currentGroupIndex]?.stories[currentStoryIndex];

  return (
    <>
      {/* Stories Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 overflow-x-auto">
        <div className="flex gap-4">
          {/* Add Story Button */}
          {currentUserId && (
            <button
              onClick={() => setShowAddStory(true)}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center border-2 border-dashed border-purple-400 hover:border-purple-600 transition-colors">
                <Plus className="w-8 h-8 text-purple-600" />
              </div>
              <span className="text-xs text-gray-600 font-medium">Add Story</span>
            </button>
          )}

          {/* Story Groups */}
          {storyGroups.map((group, index) => (
            <button
              key={group.userId}
              onClick={() => handleStoryClick(index)}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div
                className={`relative w-16 h-16 rounded-full p-0.5 ${
                  group.hasViewed
                    ? 'bg-gray-300'
                    : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'
                }`}
              >
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-gray-100">
                  <Image
                    src={getAvatarUrl(group.userAvatar)}
                    alt={group.userName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              </div>
              <span className="text-xs text-gray-600 font-medium max-w-[64px] truncate">
                {group.userName}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Add Story Modal */}
      {showAddStory && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add Story</h3>
              <button
                onClick={() => {
                  setShowAddStory(false);
                  setSelectedFile(null);
                  setCaption('');
                }}
                className="text-gray-900 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
              >
                <Plus className="w-12 h-12 text-gray-900 mx-auto mb-2" />
                <p className="text-gray-600">Click to select image or video</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden">
                  {selectedFile.type.startsWith('image/') ? (
                    <Image
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <video
                      src={URL.createObjectURL(selectedFile)}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                </div>

                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleAddStory}
                    disabled={uploading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Share Story'}
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Story Viewer */}
      {showStoryViewer && currentStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Progress bars */}
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
            {storyGroups[currentGroupIndex].stories.map((_, index) => (
              <div key={index} className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
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

          {/* Header */}
          <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                <Image
                  src={getAvatarUrl(storyGroups[currentGroupIndex].userAvatar)}
                  alt={storyGroups[currentGroupIndex].userName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  {storyGroups[currentGroupIndex].userName}
                </p>
                <p className="text-gray-300 text-xs">
                  {new Date(currentStory.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowStoryViewer(false)}
              className="text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Story Content */}
          <div className="relative w-full h-full max-w-md mx-auto">
            {currentStory.mediaType === 'image' ? (
              <Image
                src={currentStory.mediaUrl}
                alt="Story"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <video
                src={currentStory.mediaUrl}
                className="w-full h-full object-contain"
                autoPlay
                onEnded={handleNext}
              />
            )}

            {/* Caption */}
            {currentStory.caption && (
              <div className="absolute bottom-20 left-4 right-4 z-10">
                <p className="text-white text-center text-sm bg-black bg-opacity-50 rounded-lg px-4 py-2">
                  {currentStory.caption}
                </p>
              </div>
            )}

            {/* Navigation Areas */}
            <button
              onClick={handlePrevious}
              className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
            />
            <button
              onClick={handleNext}
              className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
            />
          </div>

          {/* Views Count (for own stories) */}
          {storyGroups[currentGroupIndex].userId === currentUserId && (
            <div className="absolute bottom-4 left-4 right-4 text-center z-10">
              <p className="text-white text-sm">
                👁️ {currentStory.viewsCount} views
              </p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        .animate-progress {
          animation: progress 5s linear;
        }
      `}</style>
    </>
  );
}
