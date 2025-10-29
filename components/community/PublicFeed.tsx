'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Image as ImageIcon, Send } from 'lucide-react';
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

export default function PublicFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

      // Create post
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newPost,
          imageUrl 
        }),
      });

      if (response.ok) {
        setNewPost('');
        setSelectedImage(null);
        setImagePreview(null);
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

  return (
    <div className="space-y-6">
      {/* Create Post */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleCreatePost}>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            rows={3}
          />
          {imagePreview && (
            <div className="mt-4 relative">
              <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex justify-between items-center mt-4">
            <label className="flex items-center text-gray-600 hover:text-purple-600 cursor-pointer">
              <ImageIcon className="h-5 w-5 mr-2" />
              Add Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              disabled={loading || uploading || !newPost.trim()}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Send className="h-5 w-5 mr-2" />
              {uploading ? 'Uploading...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500">No posts yet. Be the first to share!</p>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow-md p-6">
            {/* Post Header */}
            <div className="flex items-center mb-4">
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
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                  {post.userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">{post.userName}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(post.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Post Content */}
            <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

            {/* Post Image */}
            {post.imageUrl && (
              <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden">
                <Image
                  src={post.imageUrl}
                  alt="Post image"
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center space-x-6 pt-4 border-t">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center space-x-2 ${
                  post.isLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
                }`}
              >
                <Heart className={`h-5 w-5 ${post.isLiked ? 'fill-current' : ''}`} />
                <span>{post.likesCount}</span>
              </button>
              <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
                <MessageCircle className="h-5 w-5" />
                <span>{post.commentsCount}</span>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

