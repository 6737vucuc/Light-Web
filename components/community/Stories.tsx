'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X, Send, MoreVertical, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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
  viewers?: Array<{ id: number; name: string; avatar?: string; viewedAt: string }>;
}

interface StoriesProps {
  currentUser: any;
}

export default function Stories({ currentUser }: StoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [showViewer, setShowViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentUserStoryIndex, setCurrentUserStoryIndex] = useState(0);
  const [showCreator, setShowCreator] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Group stories by user
  const groupedStories = stories.reduce((acc: any, story) => {
    const userId = story.userId;
    if (!acc[userId]) {
      acc[userId] = {
        userId: story.userId,
        userName: story.userName,
        userAvatar: story.userAvatar,
        stories: [],
        hasUnviewed: false,
      };
    }
    acc[userId].stories.push(story);
    if (!story.isViewed) {
      acc[userId].hasUnviewed = true;
    }
    return acc;
  }, {});

  const userStoryGroups = Object.values(groupedStories);

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (showViewer && !isPaused) {
      startProgress();
    } else {
      stopProgress();
    }
    return () => stopProgress();
  }, [showViewer, currentStoryIndex, currentUserStoryIndex, isPaused]);

  const startProgress = () => {
    stopProgress();
    setProgress(0);
    
    const duration = 5000; // 5 seconds
    const interval = 50;
    const increment = (interval / duration) * 100;

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, interval);
  };

  const stopProgress = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

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

  const handleStoryGroupClick = (groupIndex: number) => {
    setCurrentStoryIndex(groupIndex);
    setCurrentUserStoryIndex(0);
    setShowViewer(true);
    setProgress(0);
  };

  const handleNextStory = () => {
    const currentGroup: any = userStoryGroups[currentStoryIndex];
    
    if (currentUserStoryIndex < currentGroup.stories.length - 1) {
      setCurrentUserStoryIndex(currentUserStoryIndex + 1);
      setProgress(0);
    } else if (currentStoryIndex < userStoryGroups.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setCurrentUserStoryIndex(0);
      setProgress(0);
    } else {
      setShowViewer(false);
      setProgress(0);
    }
  };

  const handlePrevStory = () => {
    if (currentUserStoryIndex > 0) {
      setCurrentUserStoryIndex(currentUserStoryIndex - 1);
      setProgress(0);
    } else if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      const prevGroup: any = userStoryGroups[currentStoryIndex - 1];
      setCurrentUserStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCreateStory = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', 'ml_default');

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/${selectedFile.type.startsWith('video') ? 'video' : 'image'}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const cloudinaryData = await cloudinaryResponse.json();
      const mediaUrl = cloudinaryData.secure_url;
      const mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';

      // Create story
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl,
          mediaType,
          caption,
        }),
      });

      if (response.ok) {
        await fetchStories();
        setShowCreator(false);
        setSelectedFile(null);
        setPreviewUrl('');
        setCaption('');
      }
    } catch (error) {
      console.error('Error creating story:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStory = async (storyId: number) => {
    try {
      const response = await fetch(`/api/stories?storyId=${storyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchStories();
        setShowViewer(false);
      }
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    const currentGroup: any = userStoryGroups[currentStoryIndex];
    const story = currentGroup.stories[currentUserStoryIndex];

    try {
      const response = await fetch('/api/messages/private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: story.userId,
          content: `Replied to your story: ${replyText}`,
        }),
      });

      if (response.ok) {
        setReplyText('');
        setShowReply(false);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const fetchViewers = async (storyId: number) => {
    try {
      const response = await fetch(`/api/stories/${storyId}/viewers`);
      if (response.ok) {
        const data = await response.json();
        setViewers(data.viewers || []);
        setShowViewers(true);
      }
    } catch (error) {
      console.error('Error fetching viewers:', error);
    }
  };

  const currentGroup: any = showViewer ? userStoryGroups[currentStoryIndex] : null;
  const currentStory = currentGroup ? currentGroup.stories[currentUserStoryIndex] : null;
  const isOwnStory = currentStory?.userId === currentUser?.id;

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {/* Create Story Card */}
          <div
            onClick={() => setShowCreator(true)}
            className="flex-shrink-0 cursor-pointer group"
          >
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 overflow-hidden border-4 border-gray-200 hover:border-purple-500 transition-all">
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
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-xs font-medium text-center text-gray-900 mt-2 truncate w-20">Your Story</p>
          </div>

          {/* Stories List */}
          {userStoryGroups.map((group: any, index: number) => (
            <div
              key={group.userId}
              onClick={() => handleStoryGroupClick(index)}
              className="flex-shrink-0 cursor-pointer group"
            >
              <div className={`relative w-20 h-20 rounded-full overflow-hidden ${
                group.hasUnviewed
                  ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[3px]'
                  : 'border-4 border-gray-300 p-0'
              } group-hover:scale-105 transition-transform`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white p-[2px]">
                  <div className="relative w-full h-full rounded-full overflow-hidden">
                    <Image
                      src={getAvatarUrl(group.userAvatar)}
                      alt={group.userName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs font-medium text-center text-gray-900 mt-2 truncate w-20">
                {group.userName}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {showViewer && currentStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={() => {
              setShowViewer(false);
              stopProgress();
            }}
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-gray-800/50 hover:bg-gray-700/50 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Progress Bars */}
          <div className="absolute top-4 left-4 right-16 z-50 flex gap-1">
            {currentGroup.stories.map((_: any, index: number) => (
              <div
                key={index}
                className="flex-1 h-1 bg-gray-600/50 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all"
                  style={{
                    width: index < currentUserStoryIndex
                      ? '100%'
                      : index === currentUserStoryIndex
                      ? `${progress}%`
                      : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Story Header */}
          <div className="absolute top-12 left-4 right-4 z-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                <Image
                  src={getAvatarUrl(currentStory.userAvatar)}
                  alt={currentStory.userName}
                  width={40}
                  height={40}
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  {currentStory.userName}
                </p>
                <p className="text-gray-300 text-xs">
                  {new Date(currentStory.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Story Options */}
            {isOwnStory && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchViewers(currentStory.id)}
                  className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-full transition-colors"
                >
                  <Eye className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => handleDeleteStory(currentStory.id)}
                  className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          {currentUserStoryIndex > 0 || currentStoryIndex > 0 ? (
            <button
              onClick={handlePrevStory}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-gray-800/50 hover:bg-gray-700/50 rounded-full flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          ) : null}

          {(currentUserStoryIndex < currentGroup.stories.length - 1 || currentStoryIndex < userStoryGroups.length - 1) && (
            <button
              onClick={handleNextStory}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-gray-800/50 hover:bg-gray-700/50 rounded-full flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Pause/Resume on Click */}
          <div
            onClick={() => setIsPaused(!isPaused)}
            className="absolute inset-0 z-30"
          />

          {/* Story Content */}
          <div className="relative w-full h-full max-w-md mx-auto flex items-center justify-center">
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
                ref={videoRef}
                src={currentStory.mediaUrl}
                className="w-full h-full object-contain"
                autoPlay
                onEnded={handleNextStory}
              />
            )}

            {/* Caption */}
            {currentStory.caption && (
              <div className="absolute bottom-24 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 z-40">
                <p className="text-white text-sm">{currentStory.caption}</p>
              </div>
            )}
          </div>

          {/* Reply Input */}
          {!isOwnStory && (
            <div className="absolute bottom-4 left-4 right-4 z-50">
              {showReply ? (
                <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm rounded-full p-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${currentStory.userName}...`}
                    className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none px-3"
                    autoFocus
                  />
                  <button
                    onClick={handleSendReply}
                    className="p-2 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full hover:from-purple-700 hover:to-blue-600 transition-all"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowReply(true)}
                  className="w-full py-3 bg-gray-800/80 backdrop-blur-sm rounded-full text-white text-sm hover:bg-gray-700/80 transition-colors"
                >
                  Send Message
                </button>
              )}
            </div>
          )}
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
                onClick={() => {
                  setShowCreator(false);
                  setSelectedFile(null);
                  setPreviewUrl('');
                  setCaption('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {previewUrl ? (
                <>
                  <div className="relative w-full h-64 bg-gray-100 rounded-xl overflow-hidden">
                    {selectedFile?.type.startsWith('video') ? (
                      <video src={previewUrl} className="w-full h-full object-contain" controls />
                    ) : (
                      <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                    )}
                  </div>

                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={3}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl('');
                        setCaption('');
                      }}
                      className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                    >
                      Change
                    </button>
                    <button
                      onClick={handleCreateStory}
                      disabled={uploading}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all font-medium shadow-md disabled:opacity-50"
                    >
                      {uploading ? 'Uploading...' : 'Share Story'}
                    </button>
                  </div>
                </>
              ) : (
                <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-gray-700 font-medium mb-1">Add Photo or Video</p>
                  <p className="text-gray-900 text-sm">or drag and drop</p>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Viewers Modal */}
      {showViewers && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Viewers ({viewers.length})
              </h2>
              <button
                onClick={() => setShowViewers(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {viewers.map((viewer) => (
                <div key={viewer.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100">
                    <Image
                      src={getAvatarUrl(viewer.avatar)}
                      alt={viewer.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{viewer.name}</p>
                    <p className="text-xs text-gray-900">
                      {new Date(viewer.viewedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
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
      `}</style>
    </>
  );
}
