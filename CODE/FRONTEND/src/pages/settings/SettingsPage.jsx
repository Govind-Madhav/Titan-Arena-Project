
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Smartphone, Globe, Gamepad2, Trophy, Clock, Lock, Save, AlertCircle, Copy, Zap } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// Tabs
const TABS = [
    { id: 'identity', label: 'Identity', icon: User },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'location', label: 'Location', icon: Globe },
    { id: 'games', label: 'Game Profiles', icon: Gamepad2 },
    { id: 'preferences', label: 'Preferences', icon: Trophy },
    { id: 'availability', label: 'Availability', icon: Clock },
    { id: 'security', label: 'Security', icon: Lock },
];

export default function SettingsPage() {
    const { getProfile, updateProfile } = useAuthStore();
    const [activeTab, setActiveTab] = useState('identity');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Combined State
    const [formData, setFormData] = useState({
        // Identity
        platformUid: '',
        ign: '',
        realName: '',
        dateOfBirth: '',
        bio: '',
        avatarUrl: '',

        // Contact
        phone: '',
        phoneVisibility: 'private',
        discordId: '',
        discordVisibility: 'private',

        // Location
        country: '',
        state: '',
        city: '',
        preferredServer: '',

        // Preferences
        skillLevel: '',
        playStyle: '',

        // Availability
        availableDays: '',
        availableTime: '',
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
                platformUid: u.platformUid || '', // System UID
                ign: p.ign || u.username || '',
                realName: p.realName || u.legalName || '',
                dateOfBirth: (p.dateOfBirth || u.dateOfBirth) ? new Date(p.dateOfBirth || u.dateOfBirth).toISOString().split('T')[0] : '',
                bio: p.bio || '',
                avatarUrl: p.avatarUrl || '',

                phone: u.phone || '',
                phoneVisibility: u.phoneVisibility || 'private',
                discordId: p.discordId || '',
                discordVisibility: p.discordVisibility || 'private',

                country: p.country || u.country || '', // Added u.country fallback
                state: p.state || u.state || '',       // Added u.state fallback
                city: p.city || u.city || '',          // Added u.city fallback
                preferredServer: p.preferredServer || '',

                skillLevel: p.skillLevel || '',
                playStyle: p.playStyle || '',

                availableDays: p.availableDays || '',
                availableTime: p.availableTime || '',
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

    if (loading) return <div className="min-h-screen pt-24 flex justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-titan-bg pb-20 pt-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
                    <p className="text-white/40">Manage your profile, preferences, and account security.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-3">
                        <nav className="flex flex-col space-y-1">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${isActive
                                            ? 'bg-titan-purple text-white shadow-neon-sm'
                                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-titan-bg-card border border-white/5 rounded-2xl p-6 sm:p-8 relative overflow-hidden"
                        >
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-titan-purple/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                            {/* Tab Content Rendering */}
                            {activeTab === 'identity' && <IdentitySection formData={formData} handleChange={handleChange} />}
                            {activeTab === 'contact' && <ContactSection formData={formData} handleChange={handleChange} />}
                            {activeTab === 'location' && <LocationSection formData={formData} handleChange={handleChange} />}
                            {activeTab === 'games' && <GamesSection gameProfiles={gameProfiles} refreshData={loadProfile} />}
                            {activeTab === 'preferences' && <PreferencesSection formData={formData} handleChange={handleChange} />}
                            {activeTab === 'availability' && <AvailabilitySection formData={formData} handleChange={handleChange} />}
                            {activeTab === 'security' && <SecuritySection />}

                            {/* Save Button (Global for form-based tabs) */}
                            {['identity', 'contact', 'location', 'preferences', 'availability'].includes(activeTab) && (
                                <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="btn-primary py-2.5 px-6 flex items-center gap-2"
                                    >
                                        {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-components (in defined order)

const IdentitySection = ({ formData, handleChange }) => {
    // Get user from store directly to access read-only fields like codes
    const { user } = useAuthStore();

    return (
        <div className="space-y-6 relative z-10">
            <h2 className="text-xl font-bold text-white mb-4">Identity</h2>

            {/* Account Info Card */}
            <div className="bg-titan-dark/50 border border-white/5 rounded-xl p-6 relative overflow-hidden group mb-6">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Shield className="w-24 h-24 text-titan-cyan" />
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold font-display text-white mb-1">Account Identity</h3>
                            <p className="text-white/40 text-sm">Your unique platform identifiers</p>
                        </div>
                        {/* Host Badge */}
                        {(user?.isHost || user?.hostStatus === 'VERIFIED') && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20">
                                <Zap className="w-3 h-3 text-pink-400" />
                                <span className="text-xs font-bold text-pink-400">HOST ACCOUNT</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Player Code */}
                        <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                            <label className="text-xs font-mono text-titan-cyan/60 uppercase tracking-wider mb-2 block">
                                Player Code
                            </label>
                            <div className="flex items-center justify-between group/code">
                                <span className="font-mono text-lg text-white font-bold tracking-widest">
                                    {user?.playerCode || user?.platformUid || 'Generating...'}
                                </span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(user?.playerCode || user?.platformUid);
                                        alert('Player Code copied!');
                                    }}
                                    className="opacity-0 group-hover/code:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-lg"
                                >
                                    <Copy className="w-4 h-4 text-titan-cyan" />
                                </button>
                            </div>
                        </div>

                        {/* Host Code (Conditional) */}
                        {(user?.hostCode) && (
                            <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                                <label className="text-xs font-mono text-pink-400/60 uppercase tracking-wider mb-2 block">
                                    Host Code
                                </label>
                                <div className="flex items-center justify-between group/code">
                                    <span className="font-mono text-lg text-white font-bold tracking-widest text-pink-200">
                                        {user.hostCode}
                                    </span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(user.hostCode);
                                            alert('Host Code copied!');
                                        }}
                                        className="opacity-0 group-hover/code:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-lg"
                                    >
                                        <Copy className="w-4 h-4 text-pink-400" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Application CTA */}
            {(!user?.isHost && user?.hostStatus !== 'VERIFIED') && (
                <div className="bg-gradient-to-r from-titan-gold/20 to-yellow-900/20 border border-titan-gold/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-titan-gold mb-1">Want to host tournaments?</h3>
                        <p className="text-sm text-white/60">Apply for host status to organize major events.</p>
                    </div>
                    <a href="/host/apply" className="px-6 py-2 bg-titan-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors">
                        Apply Now
                    </a>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup label="Display Name (IGN)" name="ign" value={formData.ign} onChange={handleChange} placeholder="e.g. ShadowSlayer" />
                <InputGroup label="Real Name" name="realName" value={formData.realName} onChange={handleChange} placeholder="Official name for prizes" />
                <InputGroup label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} />
                <InputGroup label="Avatar URL" name="avatarUrl" value={formData.avatarUrl} onChange={handleChange} placeholder="https://..." />
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">Bio</label>
                    <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple outline-none transition-colors h-24 resize-none"
                        placeholder="Tell us about your gaming journey..."
                    />
                </div>
            </div>
        </div>
    )
};

const ContactSection = ({ formData, handleChange }) => (
    <div className="space-y-6 relative z-10">
        <h2 className="text-xl font-bold text-white mb-4">Contact Info</h2>
        <div className="p-4 bg-titan-purple/10 border border-titan-purple/20 rounded-xl flex items-start gap-3 mb-6">
            <AlertCircle className="text-titan-purple shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-titan-purple/90">Contact details are required for tournament coordination. Admins can always view this info regardless of privacy settings.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
            <SelectGroup label="Phone Visibility" name="phoneVisibility" value={formData.phoneVisibility} onChange={handleChange} options={[
                { value: 'public', label: 'Public' },
                { value: 'team', label: 'Team Only' },
                { value: 'private', label: 'Private (Admins Only)' }
            ]} />
            <InputGroup label="Discord ID" name="discordId" value={formData.discordId} onChange={handleChange} placeholder="username#1234" />
            <SelectGroup label="Discord Visibility" name="discordVisibility" value={formData.discordVisibility} onChange={handleChange} options={[
                { value: 'public', label: 'Public' },
                { value: 'team', label: 'Team Only' },
                { value: 'private', label: 'Private (Admins Only)' }
            ]} />
        </div>
    </div>
);

const LocationSection = ({ formData, handleChange }) => (
    <div className="space-y-6 relative z-10">
        <h2 className="text-xl font-bold text-white mb-4">Location & Region</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label="Country" name="country" value={formData.country} onChange={handleChange} />
            <InputGroup label="State / Province" name="state" value={formData.state} onChange={handleChange} />
            <InputGroup label="City" name="city" value={formData.city} onChange={handleChange} />
            <SelectGroup label="Preferred Server" name="preferredServer" value={formData.preferredServer} onChange={handleChange} options={[
                { value: 'Asia', label: 'Asia' },
                { value: 'SEA', label: 'South East Asia' },
                { value: 'MiddleEast', label: 'Middle East' }
            ]} />
        </div>
    </div>
);

const PreferencesSection = ({ formData, handleChange }) => (
    <div className="space-y-6 relative z-10">
        <h2 className="text-xl font-bold text-white mb-4">Tournament Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectGroup label="Skill Level" name="skillLevel" value={formData.skillLevel} onChange={handleChange} options={[
                { value: 'Beginner', label: 'Beginner' },
                { value: 'SemiPro', label: 'Semi-Pro' },
                { value: 'Pro', label: 'Professional' }
            ]} />
            <SelectGroup label="Play Style" name="playStyle" value={formData.playStyle} onChange={handleChange} options={[
                { value: 'Aggressive', label: 'Aggressive' },
                { value: 'Tactical', label: 'Tactical' },
                { value: 'Balanced', label: 'Balanced' },
                { value: 'Support', label: 'Support' }
            ]} />
        </div>
    </div>
);

const AvailabilitySection = ({ formData, handleChange }) => (
    <div className="space-y-6 relative z-10">
        <h2 className="text-xl font-bold text-white mb-4">Availability</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectGroup label="Available Days" name="availableDays" value={formData.availableDays} onChange={handleChange} options={[
                { value: 'Weekdays', label: 'Weekdays' },
                { value: 'Weekends', label: 'Weekends' },
                { value: 'Both', label: 'Both' }
            ]} />
            <SelectGroup label="Preferred Time" name="availableTime" value={formData.availableTime} onChange={handleChange} options={[
                { value: 'Morning', label: 'Morning' },
                { value: 'Evening', label: 'Evening' },
                { value: 'Night', label: 'Night' }
            ]} />
        </div>
    </div>
);

const SecuritySection = () => (
    <div className="space-y-6 relative z-10">
        <h2 className="text-xl font-bold text-white mb-4">Account Security</h2>
        <div className="space-y-4">
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-white">Change Password</h3>
                    <p className="text-sm text-white/40">Update your account password</p>
                </div>
                <button className="btn-ghost px-4 py-2 text-sm">Update</button>
            </div>
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-white">Log out everywhere</h3>
                    <p className="text-sm text-white/40">End sessions on all other devices</p>
                </div>
                <button className="btn-ghost text-red-400 hover:bg-red-500/10 px-4 py-2 text-sm">Logout All</button>
            </div>
        </div>
    </div>
);

// Games Section (More complex, handles list)
const GamesSection = ({ gameProfiles, refreshData }) => {
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

    const handleRemove = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        const res = await removeGameProfile(id);
        if (res.success) {
            toast.success("Removed successfully");
            refreshData();
        }
    };

    return (
        <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Linked Game Profiles</h2>
                <button onClick={() => setIsAdding(true)} className="btn-secondary text-sm px-4 py-2">+ Add Game</button>
            </div>

            {isAdding && (
                <div className="bg-black/20 p-4 rounded-xl border border-white/10 mb-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold text-white">Add New Profile</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SelectGroup label="Game" name="game" value={newGame.game} onChange={(e) => setNewGame({ ...newGame, game: e.target.value })} options={[
                            { value: 'BGMI', label: 'BGMI' },
                            { value: 'Valorant', label: 'Valorant' },
                            { value: 'CS2', label: 'Counter-Strike 2' },
                            { value: 'FreeFire', label: 'Free Fire' }
                        ]} />
                        <InputGroup label="In-Game Name (IGN)" value={newGame.inGameName} onChange={(e) => setNewGame({ ...newGame, inGameName: e.target.value })} />
                        <InputGroup label="Game ID / UID" value={newGame.inGameId} onChange={(e) => setNewGame({ ...newGame, inGameId: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsAdding(false)} className="text-sm text-white/60 hover:text-white px-3">Cancel</button>
                        <button onClick={handleAdd} className="btn-primary px-4 py-1.5 text-sm">Add Profile</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameProfiles.map(p => (
                    <div key={p.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex justify-between items-center group hover:border-white/20 transition-all">
                        <div>
                            <span className="text-xs font-bold text-titan-purple uppercase mb-1 block">{p.game}</span>
                            <div className="font-bold text-white">{p.inGameName}</div>
                            <div className="text-sm text-white/40">{p.inGameId}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.verificationStatus === 'VERIFIED' ? 'bg-green-500/20 text-green-400' :
                                p.verificationStatus === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {p.verificationStatus}
                            </span>
                            <button onClick={() => handleRemove(p.id)} className="text-white/20 hover:text-red-400 transition-colors p-2">
                                <div className="sr-only">Delete</div>
                                <span className="text-lg">×</span>
                            </button>
                        </div>
                    </div>
                ))}
                {gameProfiles.length === 0 && !isAdding && (
                    <div className="col-span-full text-center py-8 text-white/20 italic">
                        No game profiles linked yet. Add one to join tournaments.
                    </div>
                )}
            </div>
        </div>
    );
};

// UI Helpers
const InputGroup = ({ label, type = "text", ...props }) => (
    <div>
        <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">{label}</label>
        <input
            type={type}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-titan-purple outline-none transition-colors"
            {...props}
        />
    </div>
);

const SelectGroup = ({ label, options, ...props }) => (
    <div>
        <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">{label}</label>
        <div className="relative">
            <select
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-titan-purple outline-none transition-colors appearance-none"
                {...props}
            >
                <option value="" disabled>Select...</option>
                {options.map(o => <option key={o.value} value={o.value} className="bg-gray-900 text-white">{o.label}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
        </div>
    </div>
);
