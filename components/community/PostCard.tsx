'use client';

import { useState } from 'react';
import { Heart, ThumbsDown, Trash2, Share2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';

interface PostCardProps {
  post: {
    id: number;
    content: string;
    imageUrl?: string;
    likesCount: number;
    dislikesCount: number;
    createdAt: string;
    userId: number;
    author: {
      id: number;
      name: string;
      avatar?: string;
    };
    userReaction?: string | null;
  };
  currentUserId: number;
  isAdmin?: boolean;
  onDelete?: (postId: number) => void;
}

export default function PostCard({
  post,
  currentUserId,
  isAdmin = false,
  onDelete,
}: PostCardProps) {
  const t = useTranslations('community');
  const toast = useToast();
  const [isReacting, setIsReacting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [dislikesCount, setDislikesCount] = useState(post.dislikesCount);
  const [userReaction, setUserReaction] = useState<string | null>(post.userReaction || null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString();
  };

  const handleReact = async (reactionType: 'like' | 'dislike') => {
    if (isReacting) return;

    setIsReacting(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionType }),
      });

      if (response.ok) {
        const data = await response.json();
        setLikesCount(data.likesCount);
        setDislikesCount(data.dislikesCount);
        setUserReaction(data.userReaction);
      } else {
        toast.error('Failed to react to post');
      }
    } catch (error) {
      console.error('Error reacting to post:', error);
      toast.error('Error reacting to post');
    } finally {
      setIsReacting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('postDeleted'));
        onDelete?.(post.id);
      } else {
        toast.error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error deleting post');
    } finally {
      setIsDeleting(false);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const canDelete = currentUserId === post.userId || isAdmin;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 flex-shrink-0">
            {post.author.avatar ? (
              <Image
                src={getAvatarUrl(post.author.avatar)}
                alt={post.author.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {post.author.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{post.author.name}</h3>
            <p className="text-xs text-gray-500">{formatDate(post.createdAt)}</p>
          </div>
        </div>

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 disabled:opacity-50"
            title="Delete post"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <p className="text-gray-800 mb-4 leading-relaxed break-words">{post.content}</p>

      {/* Image */}
      {post.imageUrl && (
        <div className="mb-4 rounded-xl overflow-hidden bg-gray-100 max-h-96">
          <Image
            src={post.imageUrl}
            alt="Post image"
            width={500}
            height={400}
            className="w-full h-auto object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => handleReact('like')}
          disabled={isReacting}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            userReaction === 'like'
              ? 'bg-red-100 text-red-600'
              : 'text-gray-500 hover:bg-gray-100'
          } disabled:opacity-50`}
        >
          <Heart
            className={`w-4 h-4 ${userReaction === 'like' ? 'fill-current' : ''}`}
          />
          <span className="text-sm font-bold">{likesCount}</span>
        </button>

        <button
          onClick={() => handleReact('dislike')}
          disabled={isReacting}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            userReaction === 'dislike'
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-500 hover:bg-gray-100'
          } disabled:opacity-50`}
        >
          <ThumbsDown
            className={`w-4 h-4 ${userReaction === 'dislike' ? 'fill-current' : ''}`}
          />
          <span className="text-sm font-bold">{dislikesCount}</span>
        </button>

        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-all">
          <Share2 className="w-4 h-4" />
          <span className="text-sm font-bold">Share</span>
        </button>
      </div>
    </div>
  );
}
