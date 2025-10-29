'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Image as ImageIcon, Send, ThumbsUp, Share2, MoreHorizontal, X, Smile, Video, Camera, Globe, Users, Lock, Laugh, Frown, Angry, MapPin, Tag } from 'lucide-react';
import Image from 'next/image';

interface Post {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string | null;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

interface Comment {
  id: number;
  userName: string;
  content: string;
  createdAt: string;
}

export default function PublicFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState('');
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [postPrivacy, setPostPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [showComments, setShowComments] = useState<{ [key: number]: boolean }>({});
  const [comments, setComments] = useState<{ [key: number]: Comment[] }>({});
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
  const [showReactions, setShowReactions] = useState<{ [key: number]: boolean }>({});

  const feelings = [
    { emoji: '😊', text: 'happy' },
    { emoji: '😢', text: 'sad' },
    { emoji: '😍', text: 'loved' },
    { emoji: '😂', text: 'laughing' },
    { emoji: '😡', text: 'angry' },
    { emoji: '🤔', text: 'thinking' },
    { emoji: '😴', text: 'tired' },
    { emoji: '🎉', text: 'celebrating' },
    { emoji: '🙏', text: 'blessed' },
    { emoji: '💪', text: 'motivated' },
  ];

  const reactions = [
    { emoji: '❤️', name: 'Love' },
    { emoji: '👍', name: 'Like' },
    { emoji: '😂', name: 'Haha' },
    { emoji: '😮', name: 'Wow' },
    { emoji: '😢', name: 'Sad' },
    { emoji: '🙏', name: 'Pray' },
  ];

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setLoading(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedImage);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.url;
        }
        setUploading(false);
      }

      // Create post with feeling
      let postContent = newPost;
      if (selectedFeeling) {
        postContent = `${newPost} — feeling ${selectedFeeling}`;
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: postContent,
          imageUrl,
          privacy: postPrivacy
        }),
      });

      if (response.ok) {
        setNewPost('');
        setSelectedImage(null);
        setImagePreview(null);
        setSelectedFeeling('');
        setPostPrivacy('public');
        fetchPosts();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const toggleComments = (postId: number) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleAddComment = async (postId: number) => {
    const commentText = newComment[postId];
    if (!commentText?.trim()) return;

    try {
      // TODO: Implement comment API
      // For now, just add to local state
      const newCommentObj: Comment = {
        id: Date.now(),
        userName: 'You',
        content: commentText,
        createdAt: new Date().toISOString(),
      };

      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newCommentObj]
      }));

      setNewComment(prev => ({
        ...prev,
        [postId]: ''
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleShare = async (postId: number) => {
    // TODO: Implement share functionality
    alert('Share functionality coming soon!');
  };

  return (
    <div className="space-y-4">
      {/* Stories Section - Facebook Style */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button className="flex-shrink-0 w-28 h-48 rounded-lg bg-gradient-to-b from-purple-500 to-blue-500 relative overflow-hidden group hover:scale-105 transition-transform">
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-lg">
                <Camera className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-white text-xs font-semibold">Create Story</span>
            </div>
          </button>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-28 h-48 rounded-lg bg-gradient-to-br from-purple-400 to-blue-400 relative overflow-hidden cursor-pointer group hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black opacity-70"></div>
              <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 border-4 border-white shadow-lg"></div>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white text-xs font-semibold truncate drop-shadow-lg">Believer {i}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Post - Enhanced Facebook Style */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">U</span>
          </div>
          <button
            onClick={() => document.getElementById('post-input')?.focus()}
            className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 text-left text-gray-500 transition-colors"
          >
            What's on your mind?
          </button>
        </div>

        <form onSubmit={handleCreatePost} className="space-y-3">
          <textarea
            id="post-input"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full px-4 py-2 border-0 focus:outline-none resize-none text-gray-700"
            rows={3}
          />

          {selectedFeeling && (
            <div className="flex items-center gap-2 px-4">
              <span className="text-gray-600">Feeling:</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1">
                {feelings.find(f => f.text === selectedFeeling)?.emoji} {selectedFeeling}
                <button
                  type="button"
                  onClick={() => setSelectedFeeling('')}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}

          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full rounded-lg" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex gap-1 flex-wrap">
              <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                <ImageIcon className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
              
              <button type="button" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Video className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">Video</span>
              </button>
              
              <div className="relative">
                <button 
                  type="button" 
                  onClick={() => setShowFeelingPicker(!showFeelingPicker)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Smile className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline">Feeling</span>
                </button>
                
                {showFeelingPicker && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-xl border p-3 z-10 w-64">
                    <p className="text-sm font-semibold mb-2 text-gray-700">How are you feeling?</p>
                    <div className="grid grid-cols-5 gap-2">
                      {feelings.map((feeling) => (
                        <button
                          key={feeling.text}
                          type="button"
                          onClick={() => {
                            setSelectedFeeling(feeling.text);
                            setShowFeelingPicker(false);
                          }}
                          className="text-2xl hover:bg-gray-100 rounded-lg p-2 transition-colors"
                          title={feeling.text}
                        >
                          {feeling.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {postPrivacy === 'public' && <Globe className="w-5 h-5 text-blue-500" />}
                  {postPrivacy === 'friends' && <Users className="w-5 h-5 text-green-500" />}
                  {postPrivacy === 'private' && <Lock className="w-5 h-5 text-gray-500" />}
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline capitalize">{postPrivacy}</span>
                </button>

                {showPrivacyMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-xl border p-2 z-10 w-48">
                    <button
                      type="button"
                      onClick={() => { setPostPrivacy('public'); setShowPrivacyMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Globe className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium">Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPostPrivacy('friends'); setShowPrivacyMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Users className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium">Friends</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPostPrivacy('private'); setShowPrivacyMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Lock className="w-5 h-5 text-gray-500" />
                      <span className="text-sm font-medium">Only Me</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || uploading || !newPost.trim()}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-md hover:shadow-lg"
            >
              {uploading ? 'Uploading...' : loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-500 text-lg">No posts yet. Be the first to share!</p>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Post Header */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  {post.userAvatar ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden relative">
                      <Image
                        src={post.userAvatar}
                        alt={post.userName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center text-white font-semibold text-lg shadow-md">
                      {post.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900 hover:underline cursor-pointer">{post.userName}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {new Date(post.createdAt).toLocaleString()}
                      <span>•</span>
                      <Globe className="w-3 h-3" />
                    </p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Post Content */}
              <p className="text-gray-800 mb-3 whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Post Image */}
            {post.imageUrl && (
              <div className="relative w-full h-96 bg-gray-100">
                <Image
                  src={post.imageUrl}
                  alt="Post image"
                  fill
                  className="object-contain"
                />
              </div>
            )}

            {/* Post Stats */}
            <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-600 border-b">
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  <span className="text-lg">❤️</span>
                  <span className="text-lg">👍</span>
                  <span className="text-lg">🙏</span>
                </div>
                <span>{post.likesCount}</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => toggleComments(post.id)} className="hover:underline">
                  {post.commentsCount} comments
                </button>
                <span>0 shares</span>
              </div>
            </div>

            {/* Post Actions */}
            <div className="px-4 py-2 flex items-center justify-around border-b">
              <div className="relative">
                <button
                  onClick={() => handleLike(post.id)}
                  onMouseEnter={() => setShowReactions(prev => ({ ...prev, [post.id]: true }))}
                  onMouseLeave={() => setShowReactions(prev => ({ ...prev, [post.id]: false }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                    post.isLiked ? 'text-red-600 font-semibold' : 'text-gray-600'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${post.isLiked ? 'fill-current' : ''}`} />
                  <span>{post.isLiked ? 'Liked' : 'Like'}</span>
                </button>

                {showReactions[post.id] && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white rounded-full shadow-xl border p-2 flex gap-1 z-10">
                    {reactions.map((reaction) => (
                      <button
                        key={reaction.name}
                        onClick={() => handleLike(post.id)}
                        className="text-2xl hover:scale-125 transition-transform"
                        title={reaction.name}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={() => toggleComments(post.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Comment</span>
              </button>

              <button 
                onClick={() => handleShare(post.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              >
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </button>
            </div>

            {/* Comments Section */}
            {showComments[post.id] && (
              <div className="p-4 bg-gray-50">
                {comments[post.id]?.map((comment) => (
                  <div key={comment.id} className="flex gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {comment.userName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="bg-white rounded-2xl px-4 py-2">
                        <p className="font-semibold text-sm text-gray-900">{comment.userName}</p>
                        <p className="text-gray-800 text-sm">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-3 px-4 mt-1 text-xs text-gray-600">
                        <button className="hover:underline font-semibold">Like</button>
                        <button className="hover:underline font-semibold">Reply</button>
                        <span>{new Date(comment.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Comment */}
                <div className="flex gap-2 mt-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    U
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newComment[post.id] || ''}
                      onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      placeholder="Write a comment..."
                      className="flex-1 bg-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={!newComment[post.id]?.trim()}
                      className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
