'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, MapPin } from 'lucide-react';
import Image from 'next/image';

interface PostCardProps {
  post: any;
  currentUser: any;
  onLike: (postId: number) => void;
  onComment: (postId: number) => void;
}

export default function PostCard({ post, currentUser, onLike, onComment }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getMediaUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http')) return url;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${url}`;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  const loadComments = async () => {
    if (comments.length > 0) {
      setShowComments(!showComments);
      return;
    }

    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
        setShowComments(true);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: commentText.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments([data.comment, ...comments]);
        setCommentText('');
        onComment(post.id);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/posts/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: post.id,
        }),
      });

      if (response.ok) {
        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-4">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
            {post.user?.avatar ? (
              <Image
                src={getAvatarUrl(post.user.avatar)}
                alt={post.user.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                {post.user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">{post.user?.username || post.user?.name}</p>
            {post.location && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {post.location}
              </p>
            )}
          </div>
        </div>
        <button className="text-gray-600 hover:text-gray-800">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Post Media */}
      {post.imageUrl && (
        <div className="relative w-full aspect-square bg-gray-100">
          <Image
            src={getMediaUrl(post.imageUrl)}
            alt="Post image"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {post.videoUrl && (
        <video
          src={getMediaUrl(post.videoUrl)}
          controls
          className="w-full max-h-[600px] bg-black"
        />
      )}

      {/* Post Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onLike(post.id)}
              className="hover:opacity-70 transition-opacity"
            >
              <Heart
                className={`w-6 h-6 ${post.isLiked ? 'fill-red-500 text-red-500' : 'text-gray-800'}`}
              />
            </button>
            <button
              onClick={loadComments}
              className="hover:opacity-70 transition-opacity"
            >
              <MessageCircle className="w-6 h-6 text-gray-800" />
            </button>
            <button className="hover:opacity-70 transition-opacity">
              <Send className="w-6 h-6 text-gray-800" />
            </button>
          </div>
          <button
            onClick={handleSave}
            className="hover:opacity-70 transition-opacity"
          >
            <Bookmark
              className={`w-6 h-6 ${isSaved ? 'fill-gray-800 text-gray-800' : 'text-gray-800'}`}
            />
          </button>
        </div>

        {/* Likes Count */}
        {post.likesCount > 0 && (
          <p className="font-semibold text-sm mb-2">
            {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Post Content */}
        {post.content && (
          <p className="text-sm mb-2">
            <span className="font-semibold mr-2">{post.user?.username || post.user?.name}</span>
            {post.content}
          </p>
        )}

        {/* Comments Count */}
        {post.commentsCount > 0 && (
          <button
            onClick={loadComments}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            View all {post.commentsCount} comments
          </button>
        )}

        {/* Time */}
        <p className="text-xs text-gray-400 uppercase">
          {formatTimeAgo(post.createdAt)}
        </p>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-200 px-3 py-2 max-h-64 overflow-y-auto">
          {isLoadingComments ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800 mx-auto"></div>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-2 mb-3">
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {comment.user?.avatar ? (
                    <Image
                      src={getAvatarUrl(comment.user.avatar)}
                      alt={comment.user.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                      {comment.user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold mr-2">{comment.user?.username || comment.user?.name}</span>
                    {comment.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTimeAgo(comment.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Comment */}
      <div className="border-t border-gray-200 p-3 flex items-center gap-3">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleComment()}
          placeholder="Add a comment..."
          className="flex-1 text-sm border-none focus:outline-none"
        />
        {commentText.trim() && (
          <button
            onClick={handleComment}
            className="text-sm font-semibold text-blue-500 hover:text-blue-700"
          >
            Post
          </button>
        )}
      </div>
    </div>
  );
}
