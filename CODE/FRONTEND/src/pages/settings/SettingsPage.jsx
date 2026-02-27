import React, { useState, useEffect } from 'react';
import { User, Shield, Link as LinkIcon, Lock, Eye, Wallet, Save, Copy, Trash2, LogOut, Mail, Phone, Calendar, AlertCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import FileUpload from '../../Components/common/FileUpload';

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
                            {activeSection === 'security' && <SecuritySection user={user} />}
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
const SecuritySection = ({ user }) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">🔐 Security & Recovery</h2>

        <div className="space-y-4">
            <ActionCard icon={Lock} title="Change Password" description="Update your account password" action="Change" />
            <ActionCard icon={Mail} title="Change Email Address" description={user?.email || 'Not set'} action="Change" />
            <ActionCard icon={Shield} title="Enable MFA" description="Two-factor authentication" action="Setup" />
            <ActionCard icon={Phone} title="Phone Number" description="Add or change phone number" action="Add" badge="Verified" />
            <ActionCard icon={Mail} title="Recovery Email" description="Backup email for account recovery" action="Add" badge="Verified" />
        </div>

        <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold text-white mb-4">Active Sessions</h3>
            <div className="space-y-3">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-white">Chrome on Windows</p>
                            <p className="text-sm text-white/60">Current session • Mumbai, India</p>
                        </div>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">Active</span>
                    </div>
                </div>
            </div>
            <button className="mt-4 w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-colors text-red-400 font-medium">
                <LogOut size={18} />
                Logout from All Devices
            </button>
        </div>
    </div>
);

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
const WalletSection = ({ user }) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">💳 Wallet & Billing</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-titan-purple/20 to-titan-blue/20 border border-white/10 rounded-xl">
                <p className="text-sm text-white/60 mb-1">Wallet Balance</p>
                <p className="text-2xl font-bold text-white">₹0.00</p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-sm text-white/60 mb-1">Locked Balance</p>
                <p className="text-2xl font-bold text-white">₹0.00</p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-sm text-white/60 mb-1">Wallet Status</p>
                <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-sm font-bold rounded-full">Active</span>
            </div>
        </div>

        <div>
            <h3 className="text-lg font-bold text-white mb-4">Transaction History</h3>
            <p className="text-white/40 text-sm">No transactions yet</p>
        </div>

        <div>
            <h3 className="text-lg font-bold text-white mb-4">Billing Address</h3>
            <button className="btn-secondary px-4 py-2 text-sm">Add Billing Address</button>
        </div>

        <div>
            <h3 className="text-lg font-bold text-white mb-4">Payout / Withdrawal Setup</h3>
            <p className="text-white/40 text-sm mb-4">Configure your payout method for prize winnings</p>
            <button className="btn-secondary px-4 py-2 text-sm">Setup Payout Method</button>
        </div>
    </div>
);

// Helper Component
const ActionCard = ({ icon: Icon, title, description, action, badge }) => (
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
            <button className="btn-ghost px-4 py-2 text-sm">{action}</button>
        </div>
    </div>
);
