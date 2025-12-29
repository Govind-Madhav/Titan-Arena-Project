/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import CreatePost from '../../Components/social/CreatePost';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, ShieldCheck, Zap, Trash2, LogIn } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const FeedPage = () => {
    const { user, isAuthenticated } = useAuthStore();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFeed = async () => {
        try {
            const response = await api.get('/social/feed');
            setPosts(response.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed();
    }, []);

    const handleDelete = async (postId) => {
        if (!window.confirm('Delete this post?')) return;
        try {
            await api.delete(`/social/posts/${postId}`);
            toast.success('Post Deleted');
            setPosts(posts.filter(p => p.id !== postId));
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleInteraction = () => {
        if (!isAuthenticated) {
            toast.error('Please login to interact', {
                icon: '🔒',
                style: {
                    background: '#1a1b2e',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)'
                }
            });
            return;
        }
        // Logic for like/comment would go here
    };

    return (
        <div className="min-h-screen bg-titan-bg p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-display font-bold text-white">Community Feed</h1>
                    {!isAuthenticated && (
                        <Link to="/auth" className="text-sm font-semibold text-titan-purple hover:text-white transition-colors flex items-center gap-2">
                            <LogIn size={16} /> Login to Post
                        </Link>
                    )}
                </div>

                {isAuthenticated && <CreatePost onPostCreated={fetchFeed} />}

                {loading ? (
                    <div className="text-center py-12 text-white/40 animate-pulse">Loading feed...</div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-white/40">No posts yet. Be the first to share something!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {posts.map(post => (
                            <div key={post.id} className="bg-black/30 backdrop-blur-sm border border-white/5 rounded-2xl p-6 transition-all hover:bg-black/40">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-titan-purple to-blue-600 p-[1px]">
                                            <div className="w-full h-full rounded-full bg-black overflow-hidden relative">
                                                {post.avatarUrl ? (
                                                    <img src={post.avatarUrl} alt={post.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-white bg-white/10">
                                                        {post.username?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-white text-sm">{post.username}</h3>
                                                {post.role === 'ADMIN' && <ShieldCheck size={14} className="text-titan-gold" />}
                                                {post.isHost && <Zap size={14} className="text-pink-400" />}
                                            </div>
                                            <p className="text-xs text-white/40">
                                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>

                                    {(user?.id === post.userId || user?.role === 'ADMIN') && (
                                        <button
                                            onClick={() => handleDelete(post.id)}
                                            className="text-white/20 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <p className="text-white/90 whitespace-pre-wrap mb-4 font-light leading-relaxed">
                                    {post.content}
                                </p>

                                {post.mediaUrl && (
                                    <div className="mb-4 rounded-xl overflow-hidden border border-white/10">
                                        <img src={post.mediaUrl} alt="Post content" className="w-full max-h-[400px] object-cover" />
                                    </div>
                                )}

                                <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                                    <button
                                        onClick={handleInteraction}
                                        className="flex items-center gap-2 text-white/40 hover:text-pink-500 transition-colors group"
                                    >
                                        <Heart size={18} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-sm">{post.likesCount}</span>
                                    </button>
                                    <button
                                        onClick={handleInteraction}
                                        className="flex items-center gap-2 text-white/40 hover:text-blue-400 transition-colors"
                                    >
                                        <MessageCircle size={18} />
                                        <span className="text-sm">Comment</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedPage;
