'use client';

import { useState } from 'react';
import { Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';

interface PostComposerProps {
  currentUser: any;
  onPostCreated?: (post: any) => void;
}

export default function PostComposer({ currentUser, onPostCreated }: PostComposerProps) {
  const t = useTranslations('community');
  const toast = useToast();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload image
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setImageUrl(data.url);
      } else {
        toast.error('Failed to upload image');
        setImagePreview('');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image');
      setImagePreview('');
    }
  };

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error('Please write something');
      return;
    }

    setIsPosting(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t('postCreated'));
        setContent('');
        setImageUrl('');
        setImagePreview('');
        onPostCreated?.(data.post);
      } else {
        toast.error(t('postFailed'));
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(t('postFailed'));
    } finally {
      setIsPosting(false);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 flex-shrink-0">
          {currentUser?.avatar ? (
            <Image
              src={getAvatarUrl(currentUser.avatar)}
              alt={currentUser.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
              {currentUser?.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900">{currentUser?.name}</p>
          <p className="text-xs text-gray-500">@{currentUser?.username || 'user'}</p>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('whatsOnYourMind')}
        maxLength={1000}
        rows={4}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all font-medium text-gray-900 resize-none"
      />

      {/* Character count */}
      <div className="text-right text-xs text-gray-500 mt-2">
        {content.length}/1000
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="mt-4 relative rounded-xl overflow-hidden bg-gray-100 max-h-64">
          <Image
            src={imagePreview}
            alt="Preview"
            width={500}
            height={300}
            className="w-full h-auto object-cover"
          />
          <button
            onClick={() => {
              setImagePreview('');
              setImageUrl('');
            }}
            className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-lg hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <label className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors text-purple-600">
          <ImageIcon className="w-5 h-5" />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={isPosting}
          />
        </label>

        <button
          onClick={handlePost}
          disabled={isPosting || !content.trim()}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPosting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('posting')}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {t('post')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
