import React, { useState, useEffect } from 'react';
import { User, Shield, Link as LinkIcon, Lock, Eye, Wallet, Save, Trash2, LogOut, Mail, Phone, Calendar, AlertCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import FileUpload from '../../Components/common/FileUpload';
import api from '../../lib/api';

// Sidebar Navigation
const SETTINGS_SECTIONS = [
    { id: 'account', label: 'My Account', icon: User },
    { id: 'security', label: 'Security & Recovery', icon: Shield },
    { id: 'connected', label: 'Connected Accounts', icon: LinkIcon },
    { id: 'privacy', label: 'Privacy & Social', icon: Eye },
    { id: 'wallet', label: 'Wallet & Billing', icon: Wallet },
];

export default function SettingsPage() {
    const { user, getProfile, updateProfile, uploadAvatar } = useAuthStore();
    const [activeSection, setActiveSection] = useState('account');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Combined State
    const [formData, setFormData] = useState({
        ign: '',
        username: '',
        bio: '',
        country: '',
        avatarUrl: '',
        phone: '',
        email: '',
        profileVisibility: 'public'
    });

    const [gameProfiles, setGameProfiles] = useState([]);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        const result = await getProfile();
        if (result.success) {
            const p = result.data.profile || {};
            const u = result.data;
            setFormData({
                ign: p.ign || u.username || '',
                username: u.username || '',
                bio: p.bio || '',
                country: p.country || u.country || '',
                avatarUrl: p.avatarUrl || '',
                phone: u.phone || '',
                email: u.email || '',
                profileVisibility: p.profileVisibility || 'public'
            });
            setGameProfiles(result.data.gameProfiles || []);
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        const result = await updateProfile(formData);
        if (result.success) {
            toast.success('Profile updated successfully');
        } else {
            toast.error(result.message || 'Failed to update profile');
        }
        setSaving(false);
    };

    const handleAvatarUpload = async (file, onProgress) => {
        const result = await uploadAvatar(file, onProgress);
        if (result.success) {
            toast.success('Avatar uploaded successfully!');
            setFormData(prev => ({ ...prev, avatarUrl: result.avatarUrl }));
        } else {
            toast.error(result.message || 'Failed to upload avatar');
            throw new Error(result.message);
        }
    };

    if (loading) return <div className="min-h-screen pt-24 flex justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-titan-bg pb-20 pt-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
                    <p className="text-white/40">Manage your account, security, and preferences.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-3">
                        <nav className="space-y-1 sticky top-24">
                            {SETTINGS_SECTIONS.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        {section.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-9">
                        <div className="bg-titan-bg-card border border-white/5 rounded-2xl p-6 sm:p-8">
                            {activeSection === 'account' && <AccountSection formData={formData} handleChange={handleChange} handleAvatarUpload={handleAvatarUpload} user={user} />}
                            {activeSection === 'security' && <SecuritySection user={user} refreshData={loadProfile} />}
                            {activeSection === 'connected' && <ConnectedAccountsSection gameProfiles={gameProfiles} refreshData={loadProfile} user={user} />}
                            {activeSection === 'privacy' && <PrivacySection formData={formData} handleChange={handleChange} />}
                            {activeSection === 'wallet' && <WalletSection user={user} />}

                            {/* Global Save Button for form sections */}
                            {['account', 'privacy'].includes(activeSection) && (
                                <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                                    <button onClick={handleSave} disabled={saving} className="btn-primary py-2.5 px-6 flex items-center gap-2">
                                        {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 👤 My Account Section
const AccountSection = ({ formData, handleChange, handleAvatarUpload, user }) => (
    <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-white mb-6">👤 My Account</h2>
        </div>

        {/* Profile Image */}
        <div>
            <label className="block text-sm font-medium text-white mb-3">Profile Image (Avatar)</label>
            <FileUpload onUpload={handleAvatarUpload} accept="image/*" maxSize={5 * 1024 * 1024} type="image" currentFile={formData.avatarUrl} />
        </div>

        {/* IGN & Username */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-white mb-2">IGN (In-Game Name)</label>
                <input type="text" name="ign" value={formData.ign} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-titan-purple outline-none" placeholder="Your gaming name" />
            </div>
            <div>
                <label className="block text-sm font-medium text-white mb-2">Username <span className="text-white/40 text-xs">(editable once)</span></label>
                <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-titan-purple outline-none" placeholder="@username" />
            </div>
        </div>

        {/* Bio */}
        <div>
            <label className="block text-sm font-medium text-white mb-2">Bio <span className="text-white/40 text-xs">(optional)</span></label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple outline-none h-24 resize-none" placeholder="Tell us about yourself..." />
        </div>

        {/* Country/Region */}
        <div>
            <label className="block text-sm font-medium text-white mb-2">Country / Region</label>
            <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-titan-purple outline-none" placeholder="India" />
        </div>

        {/* Primary Email */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Mail size={20} className="text-white/60" />
                    <div>
                        <p className="text-sm font-medium text-white">Primary Email Address</p>
                        <p className="text-sm text-white/60">{user?.email || 'Not set'}</p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">✓ Verified</span>
            </div>
        </div>

        {/* Account Role */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
                <User size={20} className="text-white/60" />
                <div>
                    <p className="text-sm font-medium text-white">Account Role</p>
                    <p className="text-sm text-titan-purple font-bold">{user?.isHost ? 'Host' : 'Player'}</p>
                </div>
            </div>
        </div>

        {/* Account Creation Date */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
                <Calendar size={20} className="text-white/60" />
                <div>
                    <p className="text-sm font-medium text-white">Account Created</p>
                    <p className="text-sm text-white/60">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
                </div>
            </div>
        </div>

        {/* Danger Zone */}
        <div className="border-t border-white/10 pt-8 space-y-4">
            <h3 className="text-lg font-bold text-red-400">Danger Zone</h3>
            <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl hover:bg-yellow-500/20 transition-colors">
                    <div className="text-left">
                        <p className="font-medium text-yellow-400">Deactivate Account</p>
                        <p className="text-sm text-white/60">Temporarily disable your account</p>
                    </div>
                    <AlertCircle size={20} className="text-yellow-400" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-colors">
                    <div className="text-left">
                        <p className="font-medium text-red-400">Delete Account</p>
                        <p className="text-sm text-white/60">Permanent and irreversible</p>
                    </div>
                    <Trash2 size={20} className="text-red-400" />
                </button>
            </div>
        </div>
    </div>
);

// 🔐 Security & Recovery Section
const SecuritySection = ({ user, refreshData }) => {
    const [mfaEnabled, setMfaEnabled] = useState(Boolean(user?.mfaEnabled));
    const [mfaLoading, setMfaLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [mfaSetupData, setMfaSetupData] = useState(null);
    const [mfaCode, setMfaCode] = useState('');
    const [disableMfaCode, setDisableMfaCode] = useState('');

    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailForm, setEmailForm] = useState({ newEmail: '', otp: '', password: '' });
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);

    useEffect(() => {
        fetchMfaStatus();
        fetchSessions();
    }, []);

    const fetchMfaStatus = async () => {
        try {
            const res = await api.get('/auth/mfa/status');
            if (res.data.success) {
                setMfaEnabled(Boolean(res.data.data?.enabled));
            }
        } catch (error) {
            console.error('Failed to fetch MFA status:', error);
        }
    };

    const fetchSessions = async () => {
        setSessionsLoading(true);
        try {
            const res = await api.get('/auth/sessions');
            if (res.data.success) {
                setSessions(res.data.sessions || []);
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setSessionsLoading(false);
        }
    };

    const handleInitMfa = async () => {
        setMfaLoading(true);
        try {
            const res = await api.post('/auth/mfa/setup/init');
            if (res.data.success) {
                setMfaSetupData(res.data.data);
                setShowMfaSetup(true);
                toast.success('Authenticator setup started. Scan the QR code.');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to initialize MFA setup');
        } finally {
            setMfaLoading(false);
        }
    };

    const handleVerifyMfa = async () => {
        if (!mfaCode || mfaCode.trim().length < 6) {
            toast.error('Enter a valid 6-digit authenticator code');
            return;
        }

        setMfaLoading(true);
        try {
            const res = await api.post('/auth/mfa/setup/verify', { code: mfaCode.trim() });
            if (res.data.success) {
                setMfaEnabled(true);
                setShowMfaSetup(false);
                setMfaCode('');
                setMfaSetupData(null);
                toast.success('MFA enabled successfully');
                refreshData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to verify MFA code');
        } finally {
            setMfaLoading(false);
        }
    };

    const handleDisableMfa = async () => {
        if (!disableMfaCode || disableMfaCode.trim().length < 6) {
            toast.error('Enter your authenticator code to disable MFA');
            return;
        }

        setMfaLoading(true);
        try {
            const res = await api.post('/auth/mfa/disable', { code: disableMfaCode.trim() });
            if (res.data.success) {
                setMfaEnabled(false);
                setDisableMfaCode('');
                toast.success('MFA disabled');
                refreshData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to disable MFA');
        } finally {
            setMfaLoading(false);
        }
    };

    const handleInitChangeEmail = async () => {
        if (!emailForm.newEmail) {
            toast.error('Enter new email');
            return;
        }

        setEmailLoading(true);
        try {
            const res = await api.post('/auth/change-email/init', { newEmail: emailForm.newEmail });
            if (res.data.success) {
                setEmailOtpSent(true);
                toast.success('Verification code sent to new email');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send verification code');
        } finally {
            setEmailLoading(false);
        }
    };

    const handleVerifyChangeEmail = async () => {
        if (!emailForm.otp || !emailForm.password) {
            toast.error('Enter OTP and current password');
            return;
        }

        setEmailLoading(true);
        try {
            const res = await api.post('/auth/change-email/verify', {
                newEmail: emailForm.newEmail,
                otp: emailForm.otp,
                password: emailForm.password
            });
            if (res.data.success) {
                toast.success(res.data.message || 'Email updated');
                setShowEmailModal(false);
                setEmailOtpSent(false);
                setEmailForm({ newEmail: '', otp: '', password: '' });
                refreshData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change email');
        } finally {
            setEmailLoading(false);
        }
    };

    const handleLogoutAll = async () => {
        try {
            const res = await api.post('/auth/logout-all');
            if (res.data.success) {
                toast.success('Logged out from all devices');
                fetchSessions();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to logout all sessions');
        }
    };

    const handleRevokeSession = async (sessionId) => {
        try {
            const res = await api.delete(`/auth/sessions/${sessionId}`);
            if (res.data.success) {
                toast.success('Session revoked');
                fetchSessions();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to revoke session');
        }
    };

    const mfaDescription = mfaEnabled ? 'Authenticator app protection is enabled' : 'Add Google Authenticator / Authy 2FA';

    let sessionsContent = <p className="text-white/50">No active sessions found.</p>;
    if (sessionsLoading) {
        sessionsContent = <p className="text-white/50">Loading sessions...</p>;
    } else if (sessions.length > 0) {
        sessionsContent = (
            <div className="space-y-3">
                {sessions.map((session, index) => (
                    <div key={session.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="font-medium text-white">{session.userAgent || 'Unknown device'}</p>
                                <p className="text-sm text-white/60">IP: {session.ipAddress || 'Unknown'} • Started: {new Date(session.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {index === 0 && <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">Current</span>}
                                <button onClick={() => handleRevokeSession(session.id)} className="btn-ghost px-3 py-1 text-xs">Revoke</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">🔐 Security & Recovery</h2>

            <div className="space-y-4">
                <ActionCard
                    icon={Lock}
                    title="Change Password"
                    description="Open password reset flow"
                    action="Reset"
                    onAction={() => { globalThis.location.href = '/forgot-password'; }}
                />
                <ActionCard
                    icon={Mail}
                    title="Change Email Address"
                    description={user?.email || 'Not set'}
                    action="Change"
                    onAction={() => setShowEmailModal(true)}
                />
                <ActionCard
                    icon={Shield}
                    title={mfaEnabled ? 'MFA Enabled' : 'Enable MFA'}
                    description={mfaDescription}
                    action={mfaEnabled ? 'Manage' : 'Setup'}
                    badge={mfaEnabled ? 'ON' : undefined}
                    onAction={() => {
                        if (mfaEnabled) {
                            const el = document.getElementById('disable-mfa-box');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                            handleInitMfa();
                        }
                    }}
                    disabled={mfaLoading}
                />
                <ActionCard icon={Phone} title="Phone Number" description={user?.phone || 'Add phone number'} action="Soon" badge={user?.phoneVerified ? 'Verified' : undefined} disabled />
                <ActionCard icon={Mail} title="Recovery Email" description={user?.recoveryEmail || 'Add backup email'} action="Soon" disabled />
            </div>

            {mfaEnabled && (
                <div id="disable-mfa-box" className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
                    <h3 className="text-lg font-semibold text-red-300">Disable MFA</h3>
                    <p className="text-sm text-white/70">Enter your current authenticator code to disable MFA.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={disableMfaCode}
                            onChange={(e) => setDisableMfaCode(e.target.value)}
                            placeholder="6-digit code"
                            className="w-full sm:w-60 bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none"
                        />
                        <button onClick={handleDisableMfa} className="btn-ghost px-4 py-2" disabled={mfaLoading}>
                            {mfaLoading ? 'Please wait...' : 'Disable MFA'}
                        </button>
                    </div>
                </div>
            )}

            <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-bold text-white mb-4">Active Sessions</h3>
                {sessionsContent}

                <button onClick={handleLogoutAll} className="mt-4 w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-colors text-red-400 font-medium">
                    <LogOut size={18} />
                    Logout from All Devices
                </button>
            </div>

            {showMfaSetup && mfaSetupData && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowMfaSetup(false)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setShowMfaSetup(false); }}
                >
                    <div
                        className="w-full max-w-lg bg-titan-bg-card border border-white/10 rounded-2xl p-6"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-white mb-2">Set up Authenticator App</h3>
                        <p className="text-sm text-white/70 mb-4">Scan this QR in Google Authenticator/Authy, then enter the 6-digit code.</p>

                        <div className="bg-white rounded-lg p-4 w-fit mx-auto mb-4">
                            <img src={mfaSetupData.qrCodeDataUrl} alt="MFA QR code" className="w-48 h-48" />
                        </div>

                        <p className="text-xs text-white/60 mb-2">Manual key (if scan fails):</p>
                        <div className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm break-all text-white/80 mb-4">{mfaSetupData.secret}</div>

                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value)}
                                placeholder="Enter 6-digit code"
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none"
                            />
                            <button onClick={handleVerifyMfa} className="btn-neon px-4 py-2" disabled={mfaLoading}>
                                {mfaLoading ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEmailModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowEmailModal(false)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setShowEmailModal(false); }}
                >
                    <div
                        className="w-full max-w-lg bg-titan-bg-card border border-white/10 rounded-2xl p-6 space-y-4"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-white">Change Email Address</h3>
                        <input
                            type="email"
                            value={emailForm.newEmail}
                            onChange={(e) => setEmailForm((prev) => ({ ...prev, newEmail: e.target.value }))}
                            placeholder="new-email@example.com"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none"
                        />

                        {emailOtpSent ? (
                            <>
                                <input
                                    type="text"
                                    value={emailForm.otp}
                                    onChange={(e) => setEmailForm((prev) => ({ ...prev, otp: e.target.value }))}
                                    placeholder="OTP from new email"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none"
                                />
                                <input
                                    type="password"
                                    value={emailForm.password}
                                    onChange={(e) => setEmailForm((prev) => ({ ...prev, password: e.target.value }))}
                                    placeholder="Current password"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none"
                                />
                                <button onClick={handleVerifyChangeEmail} className="btn-neon w-full py-2.5" disabled={emailLoading}>
                                    {emailLoading ? 'Updating...' : 'Verify and Update Email'}
                                </button>
                            </>
                        ) : (
                            <button onClick={handleInitChangeEmail} className="btn-neon w-full py-2.5" disabled={emailLoading}>
                                {emailLoading ? 'Sending...' : 'Send Verification Code'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// 🔗 Connected Accounts Section
const ConnectedAccountsSection = ({ gameProfiles, refreshData, user }) => {
    const { addGameProfile, removeGameProfile } = useAuthStore();
    const [isAdding, setIsAdding] = useState(false);
    const [newGame, setNewGame] = useState({ game: 'BGMI', inGameName: '', inGameId: '' });

    const handleAdd = async () => {
        if (!newGame.inGameName || !newGame.inGameId) return toast.error("Fill all fields");
        const res = await addGameProfile(newGame);
        if (res.success) {
            toast.success("Game profile added");
            setNewGame({ game: 'BGMI', inGameName: '', inGameId: '' });
            setIsAdding(false);
            refreshData();
        } else {
            toast.error(res.message);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">🔗 Connected Accounts</h2>

            {/* Auth Providers */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4">Login Providers</h3>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <span className="text-xl">G</span>
                        </div>
                        <div>
                            <p className="font-medium text-white">Google Account</p>
                            <p className="text-sm text-white/60">{user?.email}</p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">Connected</span>
                </div>
            </div>

            {/* Game Profiles */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Game Profiles</h3>
                    <button onClick={() => setIsAdding(true)} className="btn-secondary text-sm px-4 py-2">+ Add Game</button>
                </div>

                {isAdding && (
                    <div className="bg-black/20 p-4 rounded-xl border border-white/10 mb-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <select value={newGame.game} onChange={(e) => setNewGame({ ...newGame, game: e.target.value })} className="bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none">
                                <option value="BGMI">BGMI</option>
                                <option value="Valorant">Valorant</option>
                                <option value="CS2">Counter-Strike 2</option>
                                <option value="Steam">Steam</option>
                            </select>
                            <input type="text" value={newGame.inGameName} onChange={(e) => setNewGame({ ...newGame, inGameName: e.target.value })} placeholder="In-Game Name" className="bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none" />
                            <input type="text" value={newGame.inGameId} onChange={(e) => setNewGame({ ...newGame, inGameId: e.target.value })} placeholder="Game ID / UID" className="bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none" />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsAdding(false)} className="text-sm text-white/60 hover:text-white px-3">Cancel</button>
                            <button onClick={handleAdd} className="btn-primary px-4 py-1.5 text-sm">Add Profile</button>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {gameProfiles.map(p => (
                        <div key={p.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="font-medium text-white">{p.game}</p>
                                <p className="text-sm text-white/60">{p.inGameName} • {p.inGameId}</p>
                            </div>
                            <button onClick={() => removeGameProfile(p.id)} className="text-white/40 hover:text-red-400 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {gameProfiles.length === 0 && !isAdding && (
                        <p className="text-center py-8 text-white/40 italic">No game profiles linked yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// 🔏 Privacy & Social Section
const PrivacySection = ({ formData, handleChange }) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">🔏 Privacy & Social</h2>

        <div>
            <label className="block text-sm font-medium text-white mb-2">Profile Visibility</label>
            <select name="profileVisibility" value={formData.profileVisibility} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none">
                <option value="public">Public</option>
                <option value="players">Players Only</option>
                <option value="private">Private</option>
            </select>
        </div>

        <div>
            <h3 className="text-lg font-bold text-white mb-4">Blocked Users</h3>
            <p className="text-white/40 text-sm">No blocked users</p>
        </div>

        <div>
            <h3 className="text-lg font-bold text-white mb-4">Media Visibility Rules</h3>
            <p className="text-white/40 text-sm">Configure who can see your media content</p>
        </div>
    </div>
);

// 💳 Wallet & Billing Section
const WalletSection = ({ user }) => {
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [billingForm, setBillingForm] = useState({
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        invoiceEmail: user?.email || ''
    });
    const [editingBilling, setEditingBilling] = useState(false);

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            const res = await api.get('/wallet');
            if (res.data.success) {
                setWallet(res.data.data);
                if (res.data.data?.billingAddress) {
                    setBillingForm(prev => ({ ...prev, ...res.data.data.billingAddress }));
                }
                setBillingForm(prev => ({ ...prev, invoiceEmail: res.data.data?.invoiceEmail || user?.email || '' }));
            }
        } catch (error) {
            console.error('Error fetching wallet:', error);
        }

        try {
            const res = await api.get('/wallet/transactions?limit=5');
            if (res.data.success) {
                setTransactions(res.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBilling = async () => {
        setSaving(true);
        try {
            const res = await api.put('/wallet/billing', {
                billingAddress: {
                    street: billingForm.street,
                    city: billingForm.city,
                    state: billingForm.state,
                    postalCode: billingForm.postalCode,
                    country: billingForm.country
                },
                invoiceEmail: billingForm.invoiceEmail
            });
            if (res.data.success) {
                toast.success('Billing address updated!');
                setEditingBilling(false);
                fetchWalletData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update billing address');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (paise) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format((paise || 0) / 100);
    };

    if (loading) {
        return <div className="text-white/40">Loading wallet data...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">💳 Wallet & Billing</h2>

            {/* Wallet Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-titan-purple/20 to-titan-blue/20 border border-white/10 rounded-xl">
                    <p className="text-sm text-white/60 mb-1">Wallet Balance</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(wallet?.balance)}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-sm text-white/60 mb-1">Locked Balance</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(wallet?.locked)}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-sm text-white/60 mb-1">Status</p>
                    {wallet?.activation?.isActivated ? (
                        <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-sm font-bold rounded-full">Active</span>
                    ) : (
                        <span className="inline-block px-3 py-1 bg-red-500/20 text-red-400 text-sm font-bold rounded-full">Inactive</span>
                    )}
                </div>
            </div>

            {/* Activation Status */}
            {!wallet?.activation?.isActivated && (
                <div className="p-4 bg-titan-warning/10 border border-titan-warning/30 rounded-xl">
                    <p className="font-semibold text-titan-warning mb-2">⚠️ Wallet Not Activated</p>
                    <p className="text-sm text-white/60 mb-3">Complete the following to activate your wallet:</p>
                    <ul className="text-sm text-white/60 space-y-2">
                        {!wallet?.activation?.kycApproved && (
                            <li className="flex items-center gap-2">
                                <span className="text-red-400">✕</span> KYC verification (required)
                            </li>
                        )}
                        {!wallet?.activation?.hasBillingAddress && (
                            <li className="flex items-center gap-2">
                                <span className="text-red-400">✕</span> Billing address (required)
                            </li>
                        )}
                        {wallet?.activation?.kycApproved && (
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> KYC verification approved
                            </li>
                        )}
                        {wallet?.activation?.hasBillingAddress && (
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Billing address added
                            </li>
                        )}
                    </ul>
                </div>
            )}

            {/* Billing Address Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Billing Address</h3>
                    {!editingBilling && (
                        <button onClick={() => setEditingBilling(true)} className="btn-ghost text-sm px-3 py-1">
                            {wallet?.billingAddress ? 'Edit' : 'Add'}
                        </button>
                    )}
                </div>

                {editingBilling ? (
                    <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div>
                            <label className="block text-sm text-white/60 mb-2">Street Address</label>
                            <input
                                type="text"
                                value={billingForm.street}
                                onChange={(e) => setBillingForm(prev => ({ ...prev, street: e.target.value }))}
                                placeholder="123 Main St"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-titan-purple"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">City</label>
                                <input
                                    type="text"
                                    value={billingForm.city}
                                    onChange={(e) => setBillingForm(prev => ({ ...prev, city: e.target.value }))}
                                    placeholder="Mumbai"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-titan-purple"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-2">State/Province</label>
                                <input
                                    type="text"
                                    value={billingForm.state}
                                    onChange={(e) => setBillingForm(prev => ({ ...prev, state: e.target.value }))}
                                    placeholder="Maharashtra"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-titan-purple"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Postal Code</label>
                                <input
                                    type="text"
                                    value={billingForm.postalCode}
                                    onChange={(e) => setBillingForm(prev => ({ ...prev, postalCode: e.target.value }))}
                                    placeholder="400001"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-titan-purple"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Country</label>
                                <input
                                    type="text"
                                    value={billingForm.country}
                                    onChange={(e) => setBillingForm(prev => ({ ...prev, country: e.target.value }))}
                                    placeholder="India"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-titan-purple"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-white/60 mb-2">Invoice Email</label>
                            <input
                                type="email"
                                value={billingForm.invoiceEmail}
                                onChange={(e) => setBillingForm(prev => ({ ...prev, invoiceEmail: e.target.value }))}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-titan-purple"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleUpdateBilling} disabled={saving} className="btn-neon px-4 py-2 flex-1">
                                {saving ? 'Saving...' : 'Save Address'}
                            </button>
                            <button onClick={() => setEditingBilling(false)} className="btn-ghost px-4 py-2 flex-1">
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : wallet?.billingAddress ? (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <p className="text-white">{wallet.billingAddress.street}</p>
                        <p className="text-white">{wallet.billingAddress.city}, {wallet.billingAddress.state} {wallet.billingAddress.postalCode}</p>
                        <p className="text-white">{wallet.billingAddress.country}</p>
                        <p className="text-sm text-white/60 mt-2">Invoice Email: {wallet.invoiceEmail}</p>
                    </div>
                ) : (
                    <p className="text-white/40 text-sm mb-4 p-4 bg-white/5 border border-white/10 rounded-xl">No billing address yet. Add one to activate your wallet.</p>
                )}
            </div>

            {/* Recent Transactions */}
            {transactions.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-white mb-4">Recent Transactions</h3>
                    <div className="space-y-3">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-white">{tx.type.replace('_', ' ')}</p>
                                    <p className="text-sm text-white/40">{tx.message}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                    </p>
                                    <p className="text-xs text-white/30">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Component
const ActionCard = ({ icon: Icon, title, description, action, badge, onAction, disabled }) => (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-3">
            <Icon size={20} className="text-white/60" />
            <div>
                <p className="font-medium text-white">{title}</p>
                <p className="text-sm text-white/60">{description}</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            {badge && <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">{badge}</span>}
            <button onClick={onAction} disabled={disabled} className="btn-ghost px-4 py-2 text-sm disabled:opacity-50">{action}</button>
        </div>
    </div>
);
