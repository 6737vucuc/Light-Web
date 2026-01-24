'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Video, X } from 'lucide-react';

export default function CreatePostPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setError('File must be an image or video');
        return;
      }

      setSelectedMedia(file);
      setMediaPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !selectedMedia) {
      setError('Please add some content or media');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('content', content);
      if (selectedMedia) {
        formData.append('media', selectedMedia);
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post');
      }

      // Success - redirect to community
      router.push('/community');
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-gray-900 hover:text-purple-600"
          >
            Cancel
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Create Post</h1>
          <button
            onClick={handleSubmit}
            disabled={loading || (!content.trim() && !selectedMedia)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Text Content */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 resize-none"
              rows={6}
            />

            {/* Media Preview */}
            {mediaPreview && (
              <div className="mt-4 relative">
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 bg-gray-900 bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-90 z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                {selectedMedia?.type.startsWith('image/') ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full rounded-lg"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full rounded-lg"
                  />
                )}
              </div>
            )}

            {/* Media Upload Buttons */}
            <div className="mt-4 flex gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <ImageIcon className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-900">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </label>

              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Video className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-900">Video</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </label>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
