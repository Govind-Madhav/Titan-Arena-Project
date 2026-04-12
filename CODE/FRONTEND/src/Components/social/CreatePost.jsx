/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Send, Image, X, Trophy, Megaphone } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const CreatePost = ({ onPostCreated }) => {
    const { user } = useAuthStore();
    const [content, setContent] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState('');
    const [type, setType] = useState('GENERAL');
    const [loading, setLoading] = useState(false);
    const [showMediaInput, setShowMediaInput] = useState(false);

    const clearSelectedMedia = () => {
        setMediaFile(null);
        setMediaPreview('');
    };

    const handleMediaChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            clearSelectedMedia();
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file.');
            clearSelectedMedia();
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be 5MB or less.');
            clearSelectedMedia();
            return;
        }

        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        if (content.length > 800) {
            toast.error('Post content exceeds 800 characters.');
            return;
        }

        setLoading(true);
        try {
            let uploadedMediaUrl;

            if (mediaFile) {
                const formData = new FormData();
                formData.append('image', mediaFile);

                const uploadResponse = await api.post('/social/upload-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                uploadedMediaUrl = uploadResponse.data?.data?.mediaUrl;
            }

            await api.post('/social/posts', {
                content,
                mediaUrl: uploadedMediaUrl || undefined,
                type
            });
            toast.success('Post Shared!');
            setContent('');
            clearSelectedMedia();
            setType('GENERAL');
            setShowMediaInput(false);
            if (onPostCreated) onPostCreated();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-titan-bg-card border border-white/5 rounded-2xl p-6 mb-8 group focus-within:border-titan-purple/50 transition-colors">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white/40 text-sm font-bold uppercase tracking-widest">Create Post</h3>
                <span className={`text-xs ${content.length > 800 ? 'text-red-500' : 'text-white/20'}`}>
                    {content.length}/800
                </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share your achievements, thoughts, or tournament updates..."
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:bg-black/40 min-h-[100px] resize-none"
                    maxLength={800}
                />

                {/* Type Selector (Only for Hosts) */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setType('GENERAL')}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${type === 'GENERAL' ? 'bg-white/10 border-white/40 text-white' : 'border-white/5 text-white/40 hover:bg-white/5'}`}
                    >
                        General
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('ACHIEVEMENT')}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors flex items-center gap-1 ${type === 'ACHIEVEMENT' ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-500' : 'border-white/5 text-white/40 hover:bg-white/5'}`}
                    >
                        <Trophy size={12} /> Achievement
                    </button>
                    {(user?.isHost || user?.hostStatus === 'VERIFIED') && (
                        <button
                            type="button"
                            onClick={() => setType('TOURNAMENT_UPDATE')}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors flex items-center gap-1 ${type === 'TOURNAMENT_UPDATE' ? 'bg-pink-500/10 border-pink-500/40 text-pink-500' : 'border-white/5 text-white/40 hover:bg-white/5'}`}
                        >
                            <Megaphone size={12} /> Update
                        </button>
                    )}
                </div>

                {showMediaInput && (
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-3">
                        <div className="flex items-center gap-3">
                            <Image size={16} className="text-titan-purple" />
                            <label className="text-sm text-white/70 cursor-pointer hover:text-white transition-colors">
                                <span>Choose image from your device</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleMediaChange}
                                    className="hidden"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => { clearSelectedMedia(); setShowMediaInput(false); }}
                                className="ml-auto p-1 hover:bg-white/10 rounded-full"
                            >
                                <X size={14} className="text-white/40" />
                            </button>
                        </div>

                        {mediaFile && (
                            <div className="rounded-lg border border-white/10 p-2">
                                {mediaPreview && (
                                    <img src={mediaPreview} alt="Selected media preview" className="w-full max-h-56 object-cover rounded-md" />
                                )}
                                <p className="text-xs text-white/50 mt-2 truncate">{mediaFile.name}</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-between items-center pt-2">
                    <button
                        type="button"
                        onClick={() => setShowMediaInput(!showMediaInput)}
                        className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${showMediaInput ? 'bg-titan-purple/20 text-titan-purple' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Image size={18} />
                        Add Media
                    </button>

                    <button
                        type="submit"
                        disabled={loading || !content.trim() || content.length > 800}
                        className="bg-titan-gold text-black font-bold py-2 px-6 rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-transform active:scale-95"
                    >
                        {loading ? 'Posting...' : <><Send size={16} /> Post</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

CreatePost.propTypes = {
    onPostCreated: PropTypes.func
};

export default CreatePost;
