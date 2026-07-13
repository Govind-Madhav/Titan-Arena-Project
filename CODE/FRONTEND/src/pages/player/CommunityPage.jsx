/**
 * Community Page - Social Feed with Post Creation
 */

import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Upload, Image as ImageIcon, Trash2, X } from 'lucide-react';
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
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();

    if (!postContent.trim() && !selectedImage) {
      toast.error('Post content or image is required');
      return;
    }

    try {
      setPosting(true);
      let mediaUrl = null;

      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);

        const uploadRes = await api.post('/social/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        mediaUrl = uploadRes.data.data.mediaUrl;
      }

      await api.post('/social/posts', {
        content: postContent.trim(),
        mediaUrl,
        type: 'GENERAL',
      });

      toast.success('Post created successfully!');
      setPostContent('');
      setSelectedImage(null);
      setImagePreview(null);
      fetchFeed();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create post');
      console.error(error);
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!globalThis.confirm('Delete this post?')) return;

    try {
      await api.delete(`/social/posts/${postId}`);
      toast.success('Post deleted');
      fetchFeed();
    } catch (error) {
      toast.error('Failed to delete post');
      console.error(error);
    }
  };

  let feedSection = null;
  if (loading) {
    feedSection = (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-titan-purple mx-auto mb-4" />
        <p className="text-white/40">Loading feed...</p>
      </div>
    );
  } else if (feed.length === 0) {
    feedSection = (
      <SpotlightCard className="bg-titan-bg-card border-white/10 p-12 text-center">
        <p className="text-white/40">No posts yet. Be the first to share!</p>
      </SpotlightCard>
    );
  } else {
    feedSection = (
      <>
        {feed.map((post) => (
          <SpotlightCard key={post.id} className="bg-titan-bg-card border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-titan-purple to-titan-pink flex items-center justify-center overflow-hidden">
                  {post.avatarUrl ? (
                    <img src={post.avatarUrl} alt={post.username} className="w-full h-full object-cover" />
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
                  <p className="text-xs text-white/40">{new Date(post.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {post.userId === user?.id && (
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="text-white/40 hover:text-red-400 transition-colors p-2"
                  title="Delete post"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {post.content && <p className="text-white mb-4 break-words">{post.content}</p>}

            {post.mediaUrl && (
              <img src={post.mediaUrl} alt="Post" className="w-full rounded-lg mb-4 max-h-96 object-cover" />
            )}

            <div className="flex items-center gap-6 text-white/40 text-sm pt-4 border-t border-white/10">
              <button className="flex items-center gap-1 hover:text-titan-purple transition-colors">
                <Heart size={16} />
                <span>{post.likesCount || 0}</span>
              </button>
              <button className="flex items-center gap-1 hover:text-titan-purple transition-colors">
                <MessageCircle size={16} />
                <span>{post.commentsCount || 0}</span>
              </button>
              <button className="flex items-center gap-1 hover:text-titan-purple transition-colors">
                <Share2 size={16} />
                <span>Share</span>
              </button>
            </div>
          </SpotlightCard>
        ))}
      </>
    );
  }

  return (
    <Layout userRole={user?.role || 'PLAYER'}>
      <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">
              Community <GradientText>Feed</GradientText>
            </h1>
          </div>

          <SpotlightCard className="bg-titan-bg-card border-white/10 p-6 mb-8">
            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea
                value={postContent}
                onChange={(event) => setPostContent(event.target.value)}
                placeholder="Share something with the community..."
                className="w-full min-h-28 bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 outline-none resize-none"
              />

              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-72 object-cover" />
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

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/10 hover:border-titan-purple cursor-pointer transition-colors">
                  <ImageIcon size={18} className="text-titan-purple" />
                  <span className="text-sm text-white">Add Image</span>
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
                <span className="text-xs text-white/40">PNG, JPG, GIF (Max 5MB)</span>
              </div>

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

          <div className="space-y-6">{feedSection}</div>
        </div>
      </div>
    </Layout>
  );
};

export default CommunityPage;
