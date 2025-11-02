'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Smile } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Post {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string | null;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
}

interface Comment {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string | null;
  content: string;
  createdAt: string;
}

interface PublicFeedProps {
  currentUser?: any;
}

export default function PublicFeed({ currentUser }: PublicFeedProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState<{ [key: number]: boolean }>({});
  const [comments, setComments] = useState<{ [key: number]: Comment[] }>({});
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
  const [loadingComments, setLoadingComments] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: number) => {
    if (loadingComments[postId]) return;
    
    try {
      setLoadingComments({ ...loadingComments, [postId]: true });
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments({ ...comments, [postId]: data.comments || [] });
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments({ ...loadingComments, [postId]: false });
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: !post.isLiked,
              likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSave = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return { ...post, isSaved: !post.isSaved };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handleComment = async (postId: number) => {
    const commentText = newComment[postId]?.trim();
    if (!commentText) return;

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments({
          ...comments,
          [postId]: [...(comments[postId] || []), data.comment]
        });
        setNewComment({ ...newComment, [postId]: '' });
        
        // Update comments count
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return { ...post, commentsCount: post.commentsCount + 1 };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const toggleComments = (postId: number) => {
    const isShowing = showComments[postId];
    setShowComments({ ...showComments, [postId]: !isShowing });
    
    if (!isShowing && !comments[postId]) {
      fetchComments(postId);
    }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getImageUrl = (imageUrl?: string | null) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${imageUrl}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 xl:pb-4">
      {posts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No posts yet</p>
          <p className="text-gray-400 text-sm mt-2">Follow people to see their posts here</p>
        </div>
      ) : (
        posts.map((post) => (
          <article key={post.id} className="bg-white border border-gray-200 rounded-lg">
            {/* Post Header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/user-profile/${post.userId}`)}
                  className="relative w-8 h-8 rounded-full overflow-hidden"
                >
                  <Image
                    src={getAvatarUrl(post.userAvatar)}
                    alt={post.userName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
                <div>
                  <button
                    onClick={() => router.push(`/user-profile/${post.userId}`)}
                    className="font-semibold text-sm hover:text-gray-600"
                  >
                    {post.userName}
                  </button>
                  <p className="text-xs text-gray-500">{formatTime(post.createdAt)}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreHorizontal className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Post Image */}
            {post.imageUrl && (
              <div className="relative w-full aspect-square bg-gray-100">
                <Image
                  src={getImageUrl(post.imageUrl)}
                  alt="Post"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            {/* Post Actions */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="hover:opacity-60 transition-opacity"
                  >
                    {post.isLiked ? (
                      <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                    ) : (
                      <Heart className="w-6 h-6 text-gray-900" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="hover:opacity-60 transition-opacity"
                  >
                    <MessageCircle className="w-6 h-6 text-gray-900" />
                  </button>
                  <button className="hover:opacity-60 transition-opacity">
                    <Send className="w-6 h-6 text-gray-900" />
                  </button>
                </div>
                <button
                  onClick={() => handleSave(post.id)}
                  className="hover:opacity-60 transition-opacity"
                >
                  {post.isSaved ? (
                    <Bookmark className="w-6 h-6 text-gray-900 fill-gray-900" />
                  ) : (
                    <Bookmark className="w-6 h-6 text-gray-900" />
                  )}
                </button>
              </div>

              {/* Likes Count */}
              {post.likesCount > 0 && (
                <p className="font-semibold text-sm mb-2">
                  {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
                </p>
              )}

              {/* Post Caption */}
              {post.content && (
                <div className="text-sm mb-2">
                  <button
                    onClick={() => router.push(`/user-profile/${post.userId}`)}
                    className="font-semibold mr-2 hover:text-gray-600"
                  >
                    {post.userName}
                  </button>
                  <span className="text-gray-900">{post.content}</span>
                </div>
              )}

              {/* View Comments */}
              {post.commentsCount > 0 && !showComments[post.id] && (
                <button
                  onClick={() => toggleComments(post.id)}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-2"
                >
                  View all {post.commentsCount} comments
                </button>
              )}

              {/* Comments List */}
              {showComments[post.id] && (
                <div className="space-y-2 mb-3">
                  {loadingComments[post.id] ? (
                    <p className="text-sm text-gray-500">Loading comments...</p>
                  ) : (
                    comments[post.id]?.map((comment) => (
                      <div key={comment.id} className="text-sm">
                        <button
                          onClick={() => router.push(`/user-profile/${comment.userId}`)}
                          className="font-semibold mr-2 hover:text-gray-600"
                        >
                          {comment.userName}
                        </button>
                        <span className="text-gray-900">{comment.content}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Add Comment */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <button className="hover:opacity-60 transition-opacity">
                  <Smile className="w-6 h-6 text-gray-400" />
                </button>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment[post.id] || ''}
                  onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleComment(post.id);
                    }
                  }}
                  className="flex-1 text-sm outline-none"
                />
                {newComment[post.id]?.trim() && (
                  <button
                    onClick={() => handleComment(post.id)}
                    className="text-blue-500 font-semibold text-sm hover:text-blue-700"
                  >
                    Post
                  </button>
                )}
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
