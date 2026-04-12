/**
 * Community Page - Social Feed with Post Creation
 */

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Upload, Image as ImageIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import Layout from '../../Components/layout/Layout';
import { GradientText, SpotlightCard } from '../../Components/effects/ReactBits';
import useAuthStore from '../../store/authStore';

const CommunityPage = () => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [postContent, setPostContent] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await api.get('/social/feed');
      setFeed(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch feed:', err);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();

    if (!postContent.trim() && !selectedImage) {
      toast.error('Post content or image is required');
      return;
    }

    try {
      setPosting(true);
      let mediaUrl = null;

      // Upload image if selected
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);

        const uploadRes = await api.post('/social/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        mediaUrl = uploadRes.data.data.mediaUrl;
      }

      // Create post
      const res = await api.post('/social/posts', {
        content: postContent.trim(),
        mediaUrl,
        type: 'GENERAL'
      });

      toast.success('Post created successfully!');
      setPostContent('');
      setSelectedImage(null);
      setImagePreview(null);

      // Refresh feed
      fetchFeed();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create post';
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;

    try {
      await api.delete(`/social/posts/${postId}`);
      toast.success('Post deleted');
      fetchFeed();
    } catch (err) {
      toast.error('Failed to delete post');
      console.error(err);
    }
  };

  return (
    <Layout userRole={user?.role || 'PLAYER'}>
      <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">
              Community <GradientText>Feed</GradientText>
            </h1>
            <p className="text-white/40 text-lg">
              Connect with other players, share highlights, and celebrate wins together.
            </p>
          </div>

          {/* Post Creation Form */}
          <SpotlightCard className="bg-titan-bg-card border-white/10 p-6 mb-8">
            <h2 className="font-heading text-xl font-bold text-white mb-4">Create a Post</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              {/* Text Input */}
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share your gaming moments, strategies, or connect with the community..."
                rows="4"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-titan-purple focus:outline-none resize-none"
              />

              {/* Image Preview */}
              {imagePreview && (
                <div className="relative rounded-lg overflow-hidden bg-black/40 border border-white/10 p-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-64 w-full object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 p-2 rounded-full transition-colors"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              )}

              {/* Image Upload Input */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/10 hover:border-titan-purple cursor-pointer transition-colors">
                  <ImageIcon size={18} className="text-titan-purple" />
                  <span className="text-sm text-white">Add Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-white/40">PNG, JPG, GIF (Max 5MB)</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={posting || (!postContent.trim() && !selectedImage)}
                className="w-full btn-neon py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={18} />
                {posting ? 'Posting...' : 'Post'}
              </button>
            </form>
          </SpotlightCard>

          {/* Feed */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-titan-purple mx-auto mb-4"></div>
                <p className="text-white/40">Loading feed...</p>
              </div>
            ) : feed.length === 0 ? (
              <SpotlightCard className="bg-titan-bg-card border-white/10 p-12 text-center">
                <p className="text-white/40">No posts yet. Be the first to share!</p>
              </SpotlightCard>
            ) : (
              feed.map((post) => (
                <SpotlightCard key={post.id} className="bg-titan-bg-card border-white/10 p-6">
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-titan-purple to-titan-pink flex items-center justify-center">
                        {post.avatarUrl ? (
                          <img
                            src={post.avatarUrl}
                            alt={post.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-sm">
                            {post.username?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-semibold">
                          {post.username}
                          {post.isHost && (
                            <span className="ml-2 text-xs bg-titan-purple/30 text-titan-purple px-2 py-1 rounded">
                              HOST
                            </span>
                          )}
                        </p>
                        <p className="text-white/40 text-xs">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Delete Button (Owner Only) */}
                    {user?.id === post.userId && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-white/40 hover:text-red-400 transition-colors"
                        title="Delete post"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  {post.content && (
                    <p className="text-white mb-4 break-words">{post.content}</p>
                  )}

                  {/* Post Media */}
                  {post.mediaUrl && (
                    <img
                      src={post.mediaUrl}
                      alt="Post"
                      className="w-full rounded-lg mb-4 max-h-96 object-cover"
                    />
                  )}

                  {/* Post Stats */}
                  <div className="flex items-center gap-6 text-white/40 text-sm pt-4 border-t border-white/10">
                    <button className="flex items-center gap-1 hover:text-titan-purple transition-colors">
                      <Heart size={16} />
                      <span>{post.likesCount}</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-titan-purple transition-colors">
                      <MessageCircle size={16} />
                      <span>0</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-titan-purple transition-colors">
                      <Share2 size={16} />
                      <span>Share</span>
                    </button>
                  </div>
                </SpotlightCard>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CommunityPage;
