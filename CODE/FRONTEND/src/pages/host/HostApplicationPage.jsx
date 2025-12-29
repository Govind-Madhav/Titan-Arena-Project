/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast'; // Kept toast
import { Shield, FileText, Link, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const HostApplicationPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        notes: '',
        documentsUrl: ''
    });

    useEffect(() => {
        if (user?.isHost || user?.hostStatus === 'VERIFIED') {
            toast.success('You are already a Host!');
            navigate('/dashboard');
        }
    }, [user, navigate]);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.post('/host/apply', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                navigate('/dashboard'); // Redirect to dashboard or stay
            }
        } catch (error) {
            console.error('Application failed:', error);
            toast.error(error.response?.data?.message || 'Failed to submit application');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-titan-dark text-white p-6 md:p-12">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8 text-center">
                    <div className="inline-block p-4 rounded-full bg-titan-gold/10 mb-4 border border-titan-gold/20">
                        <Shield className="w-12 h-12 text-titan-gold" />
                    </div>
                    <h1 className="text-3xl font-bold font-display tracking-wider mb-2">Apply for Host Status</h1>
                    <p className="text-white/60">
                        Become a verified tournament organizer on Titan Arena.
                        Submit your application for admin review.
                    </p>
                </div>

                <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Notes Field */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-titan-cyan" />
                                Why do you want to host?
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-titan-cyan focus:ring-1 focus:ring-titan-cyan transition-all h-32 resize-none"
                                placeholder="Tell us about your experience and plans..."
                            />
                        </div>

                        {/* Documents URL Field */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                                <Link className="w-4 h-4 text-titan-cyan" />
                                Portfolio / Socials (Optional)
                            </label>
                            <input
                                type="url"
                                name="documentsUrl"
                                value={formData.documentsUrl}
                                onChange={handleChange}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-titan-cyan focus:ring-1 focus:ring-titan-cyan transition-all"
                                placeholder="https://..."
                            />
                            <p className="text-xs text-white/40 mt-2">
                                Provide links to your past tournaments, streaming channels, or social media for verification.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-titan-gold to-yellow-600 hover:from-titan-gold/80 hover:to-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="animate-pulse">Submitting...</span>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Submit Application
                                </>
                            )}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default HostApplicationPage;
