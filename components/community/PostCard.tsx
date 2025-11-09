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
        setComments([...comments, data.comment]);
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
        body: JSON.stringify({ postId: post.id }),
      });

      if (response.ok) {
        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 mb-0">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gray-200">
            {post.user?.avatar ? (
              <Image
                src={getAvatarUrl(post.user.avatar)}
                alt={post.user.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-sm">
                {post.user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{post.user?.username || post.user?.name}</p>
            {post.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{post.location}</span>
              </div>
            )}
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <MoreHorizontal className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Post Media */}
      {post.mediaType === 'image' && post.imageUrl && (
        <div className="relative w-full aspect-square bg-black">
          <Image
            src={getMediaUrl(post.imageUrl)}
            alt="Post image"
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      )}

      {post.mediaType === 'video' && post.videoUrl && (
        <div className="relative w-full aspect-square bg-black">
          <video
            src={getMediaUrl(post.videoUrl)}
            controls
            className="w-full h-full object-contain"
          />
        </div>
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
                className={`w-7 h-7 ${post.isLiked ? 'fill-red-500 text-red-500' : 'text-gray-800'}`}
                strokeWidth={1.5}
              />
            </button>
            <button
              onClick={loadComments}
              className="hover:opacity-70 transition-opacity"
            >
              <MessageCircle className="w-7 h-7 text-gray-800" strokeWidth={1.5} />
            </button>
            <button className="hover:opacity-70 transition-opacity">
              <Send className="w-7 h-7 text-gray-800" strokeWidth={1.5} />
            </button>
          </div>
          <button
            onClick={handleSave}
            className="hover:opacity-70 transition-opacity"
          >
            <Bookmark
              className={`w-6 h-6 ${isSaved ? 'fill-gray-800 text-gray-800' : 'text-gray-800'}`}
              strokeWidth={1.5}
            />
          </button>
        </div>

        {/* Likes Count */}
        {post.likesCount > 0 && (
          <p className="font-semibold text-sm mb-1">
            {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Post Content */}
        {post.content && (
          <p className="text-sm mb-1">
            <span className="font-semibold mr-2">{post.user?.username || post.user?.name}</span>
            {post.content}
          </p>
        )}

        {/* Comments Count */}
        {post.commentsCount > 0 && (
          <button
            onClick={loadComments}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1"
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
        <div className="border-t border-gray-200 px-3 py-2">
          {isLoadingComments ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800 mx-auto"></div>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2 mb-2">
                  <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold mr-2">{comment.user?.username}</span>
                      {comment.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatTimeAgo(comment.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Add Comment */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleComment()}
              placeholder="Add a comment..."
              className="flex-1 text-sm border-none focus:outline-none bg-transparent min-w-0"
            />
            {commentText.trim() && (
              <button
                onClick={handleComment}
                className="text-blue-500 font-semibold text-sm hover:text-blue-700"
              >
                Post
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
