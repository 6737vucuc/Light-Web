'use client';

import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Video, MapPin } from 'lucide-react';
import Image from 'next/image';

interface CreatePostProps {
  currentUser: any;
  onPostCreated: () => void;
}

export default function CreatePost({ currentUser, onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedVideo(reader.result as string);
      setSelectedImages([]);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && selectedImages.length === 0 && !selectedVideo) {
      return;
    }

    setIsPosting(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: selectedImages.length > 0 ? selectedImages[0] : null,
          videoUrl: selectedVideo,
          mediaType: selectedVideo ? 'video' : selectedImages.length > 0 ? 'image' : 'text',
          location: location.trim() || null,
        }),
      });

      if (response.ok) {
        setContent('');
        setSelectedImages([]);
        setSelectedVideo(null);
        setLocation('');
        setShowLocationInput(false);
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex gap-3">
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {currentUser?.avatar ? (
            <Image
              src={getAvatarUrl(currentUser.avatar)}
              alt={currentUser.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
              {currentUser?.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${currentUser?.name?.split(' ')[0]}?`}
            className="w-full resize-none border-none focus:outline-none text-sm bg-transparent"
            rows={3}
          />

          {selectedImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {selectedImages.map((img, index) => (
                <div key={index} className="relative aspect-square">
                  <Image
                    src={img}
                    alt={`Selected ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                    unoptimized
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-gray-900 bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedVideo && (
            <div className="relative mt-3">
              <video
                src={selectedVideo}
                controls
                className="w-full rounded-lg max-h-64"
              />
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute top-2 right-2 bg-gray-900 bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {showLocationInput && (
            <div className="mt-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
                className="flex-1 text-sm border-none focus:outline-none bg-transparent min-w-0"
              />
              <button
                onClick={() => {
                  setShowLocationInput(false);
                  setLocation('');
                }}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-1 flex-wrap">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={!!selectedVideo}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <ImageIcon className="w-5 h-5 text-green-500" />
                <span className="text-xs md:text-sm text-gray-700">Photo</span>
              </button>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={selectedImages.length > 0}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <Video className="w-5 h-5 text-red-500" />
                <span className="text-xs md:text-sm text-gray-700">Video</span>
              </button>

              <button
                onClick={() => setShowLocationInput(!showLocationInput)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MapPin className="w-5 h-5 text-blue-500" />
                <span className="text-xs md:text-sm text-gray-700">Location</span>
              </button>
            </div>

            <button
              onClick={handlePost}
              disabled={isPosting || (!content.trim() && selectedImages.length === 0 && !selectedVideo)}
              className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm flex-shrink-0"
            >
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
