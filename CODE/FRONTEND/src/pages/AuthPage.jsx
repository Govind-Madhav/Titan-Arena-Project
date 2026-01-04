/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Gamepad2, Check, Calendar, Phone, MapPin, FileText } from 'lucide-react'
import Stepper, { Step } from '../Components/Stepper'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import { Particles } from '../Components/effects/ReactBits'
import Navbar from '../Components/layout/Navbar'
import { countries } from '../lib/countries'
import { getAllStates, getDistrictsByState } from '../lib/india-locations';
import api from '../lib/api'; // Import API client

export default function AuthPage() {

    const [isLogin, setIsLogin] = useState(true)
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [isVerificationSent, setIsVerificationSent] = useState(false)
    const [resendTimer, setResendTimer] = useState(0)

    // Wizard State
    // Wizard State
    // Stepper handles its own state, but we might want to know it or just rely on content
    // We can remove 'step' state if we don't need it outside, or keep it to sync if needed.
    // Let's keep 'step' only if we need to show headers etc outside stepper. 
    // Actually Stepper is inside the form container.
    // We'll remove manual 'step' state usage for rendering and let Stepper drive.
    // BUT Stepper needs initialStep.
    // NOTE: We'll still use local state to track current step index if we want specific headers?
    // The existing code used 'step' for header text. 
    // Let's rely on Stepper's onStepChange to update a local 'currentStep' for header text.
    const [currentStep, setCurrentStep] = useState(1);

    const [formData, setFormData] = useState({
        ign: '',              // NEW
        username: '',
        email: '',
        password: '',
        confirmPassword: '', // NEW
        legalName: '',
        dateOfBirth: '',
        phone: '',
        region: '',          // NEW
        subRegion: '',       // NEW
        country: '',
        state: '',
        city: '',
        termsAccepted: false
    })

    // Availability State
    const [usernameAvailable, setUsernameAvailable] = useState(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [ignAvailable, setIgnAvailable] = useState(null); // NEW
    const [isCheckingIgn, setIsCheckingIgn] = useState(false); // NEW

    // Unified Auth Store (Hybrid)
    const { syncWithBackend, isLoading } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const from = location.state?.from?.pathname || '/'

    // Clear form when switching between login/signup
    useEffect(() => {
        setFormData({
            ign: '',
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            legalName: '',
            dateOfBirth: '',
            phone: '',
            region: '',
            subRegion: '',
            country: '',
            state: '',
            city: '',
            termsAccepted: false
        })
        setCurrentStep(1)
    }, [isLogin])

    // Resend cooldown timer
    // (Removed phone OTP resend)

    // Debounced IGN Check (NEW)
    useEffect(() => {
        if (isLogin || !formData.ign || formData.ign.length < 3) {
            setIgnAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingIgn(true);
            try {
                const res = await api.post('/auth/check-ign', { ign: formData.ign });
                setIgnAvailable(res.data.available);
            } catch (error) {
                console.error('IGN check failed', error);
                setIgnAvailable(null);
            } finally {
                setIsCheckingIgn(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [formData.ign, isLogin]);

    // Debounced Username Check
    useEffect(() => {
        if (isLogin || !formData.username || formData.username.length < 3) {
            setUsernameAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingUsername(true);
            try {
                const res = await api.post('/auth/check-availability', { username: formData.username });
                setUsernameAvailable(res.data.available);
            } catch (error) {
                console.error('Username check failed', error);
                setUsernameAvailable(null);
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.username, isLogin]);

    const handleBeforeNextStep = async (stepCalled) => {
        if (stepCalled === 1) {
            if (!formData.username || !formData.legalName || !formData.dateOfBirth || !formData.country || !formData.state) {
                toast.error('Please fill in all personal details')
                return false
            }
            // Additional validation if needed
            return true
        }
        return true
    }

    const handleRegistrationComplete = () => {
        // Trigger the form submission logic for registration
        // We can simulate an event or just call the logic
        handleSubmit({ preventDefault: () => { } })
    }

    const [isAuthProcessing, setIsAuthProcessing] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        const { auth } = await import('../lib/firebase')
        const { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } = await import('firebase/auth')

        if (isLogin) {
            // --- FIREBASE LOGIN (Email/Password) ---
            if (!formData.email || !formData.password) return toast.error('Email and password required')

            setIsAuthProcessing(true)
            try {
                const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)
                const user = userCredential.user

                // 🚨 Frontend Check (Pre-sync)
                if (!user.emailVerified) {
                    setIsVerificationSent(true)
                    toast.error('Uplink Interrupted: Email verification required.')

                    // Dispatch custom branded verification link
                    await api.post('/auth/trigger-verification', {
                        email: user.email,
                        username: formData.username || user.displayName
                    });

                    setIsAuthProcessing(false)
                    return
                }

                toast.success('Identity Verified. Syncing profile...')

                const syncResult = await syncWithBackend()
                if (syncResult.success) {
                    toast.success('Welcome to Titan Arena!')
                    navigate(from, { replace: true })
                } else {
                    if (syncResult.code === 'EMAIL_NOT_VERIFIED') {
                        setIsVerificationSent(true)
                        await api.post('/auth/trigger-verification', {
                            email: user.email,
                            username: formData.username || user.displayName
                        });
                    }
                    toast.error(syncResult.message)
                }
            } catch (error) {
                console.error('Login Failed:', error)
                toast.error(error.message || 'Verification failed')
            } finally {
                setIsAuthProcessing(false)
            }
        } else {
            // --- CUSTOM BACKEND SIGNUP (Email/Password with OTP) ---
            if (currentStep === 2) {
                if (!formData.termsAccepted) return toast.error('Accept terms to proceed')

                // Frontend validation
                if (formData.password !== formData.confirmPassword) {
                    return toast.error("Passwords don't match")
                }

                // Block if checking IGN
                if (isCheckingIgn) {
                    return toast.error("Please wait for gamertag availability check")
                }

                // Check IGN is available
                if (ignAvailable === false) {
                    return toast.error("Gamertag is already taken")
                }

                setIsAuthProcessing(true)
                try {
                    // Prepare payload (remove confirmPassword)
                    const payload = {
                        ign: formData.ign.trim(),
                        username: formData.username,
                        legalName: formData.legalName,
                        email: formData.email,
                        password: formData.password,
                        phone: formData.phone,
                        region: Number(formData.region),
                        subRegion: formData.subRegion || null,
                        country: formData.country,
                        state: formData.state,
                        city: formData.city || null,
                        dateOfBirth: formData.dateOfBirth,
                        termsAccepted: formData.termsAccepted
                    }

                    // Call custom backend signup
                    const response = await api.post('/auth/signup', payload)

                    setIsVerificationSent(true)
                    toast.success('Verification code sent to your email!')
                } catch (error) {
                    console.error('Signup Failed:', error)
                    toast.error(error.response?.data?.message || 'Registration failed')
                } finally {
                    setIsAuthProcessing(false)
                }
            }
        }
    }

    // Handle region change (reset sub-region)
    const handleRegionChange = (e) => {
        setFormData({
            ...formData,
            region: e.target.value,
            subRegion: '' // Reset sub-region when region changes
        })
    }

    const handleResendEmail = async () => {
        const { auth } = await import('../lib/firebase')
        const { sendEmailVerification } = await import('firebase/auth')

        if (!auth.currentUser) return toast.error('No active session found.')

        try {
            await api.post('/auth/trigger-verification', {
                email: auth.currentUser.email,
                username: formData.username || auth.currentUser.displayName
            });
            toast.success('Verification link resent!')
            setResendTimer(60)
            const interval = setInterval(() => {
                setResendTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(interval)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } catch (error) {
            toast.error('Failed to resend email. Try again later.')
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    // Slideshow state
    const [currentSlide, setCurrentSlide] = useState(0)
    const [slides] = useState([
        {
            id: 1,
            title: "DOMINATE THE LADDER",
            desc: "Join daily tournaments and climb the global rankings. Prove your worth.",
            color: "from-titan-purple to-titan-blue",
            icon: <Gamepad2 size={64} className="text-white/80" />
        },
        {
            id: 2,
            title: "INSTANT CRYPTO PAYOUTS",
            desc: "Secure wallet integration for immediate prize distribution. No delays.",
            color: "from-titan-success to-titan-cyan",
            icon: <Check size={64} className="text-white/80" />
        },
        {
            id: 3,
            title: "ELITE COMMUNITY",
            desc: "Connect with pro players, build your team, and scrim against the best.",
            color: "from-orange-500 to-red-500",
            icon: <User size={64} className="text-white/80" />
        }
    ])

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col">
            {/* Navbar Re-integrated */}
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            {/* Main Content Split - Account for Navbar height with pt-20 */}
            <div className="flex-1 flex pt-20 min-h-screen">

                {/* LEFT SIDE: BANNER / SLIDESHOW (Hidden on mobile) */}
                <div className="hidden lg:flex lg:w-1/2 relative bg-titan-bg-light overflow-hidden items-center justify-center p-12 border-r border-white/5">
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-[#050505]" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:50px_50px] opacity-50" />

                    {/* Animated Glow Blobs */}
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 90, 0],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r ${slides[currentSlide].color} rounded-full blur-[120px] mix-blend-screen opacity-30 transition-colors duration-1000`}
                    />

                    {/* Content Container */}
                    <div className="relative z-10 w-full max-w-lg">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="space-y-8"
                            >
                                <div className="w-24 h-24 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(255,255,255,0.1)]">
                                    {slides[currentSlide].icon}
                                </div>

                                <div className="space-y-4">
                                    <h1 className="font-display font-black text-6xl tracking-tighter leading-none">
                                        {slides[currentSlide].title.split(' ').map((word, i) => (
                                            <span key={i} className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                                                {word}
                                            </span>
                                        ))}
                                    </h1>
                                    <p className="font-mono text-lg text-white/60 max-w-md border-l-2 border-titan-purple pl-4">
                                        {slides[currentSlide].desc}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Progress Indicators */}
                        <div className="flex gap-3 mt-12">
                            {slides.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1 cursor-pointer hover:bg-white/60 rounded-full transition-all duration-500 ${currentSlide === idx ? 'w-12 bg-titan-purple' : 'w-4 bg-white/20'}`}
                                    onClick={() => setCurrentSlide(idx)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: AUTH FORM */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative">

                    {/* Mobile Only Background */}
                    <div className="absolute inset-0 lg:hidden bg-[#050505]">
                        <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-titan-purple/20 blur-[100px] rounded-full" />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full max-w-md relative z-10"
                    >
                        {/* Form Container */}
                        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-8">
                                <h2 className="font-display text-3xl font-bold mb-2">
                                    {isLogin ? 'Welcome Back' : 'Sign Up'}
                                </h2>

                                <p className="text-white/40 text-sm mb-2 font-mono leading-relaxed">
                                    {isLogin ? 'Access the mainframe.' : (currentStep === 1 ? 'Establish personal profile.' : 'Secure credentials.')}
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-2 relative z-10">

                                    {/* --- VERIFICATION PENDING OVERLAY --- */}
                                    {isVerificationSent && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="absolute inset-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-titan-purple/20 flex items-center justify-center mb-6 animate-pulse">
                                                <Mail size={32} className="text-titan-purple" />
                                            </div>
                                            <h3 className="font-display text-xl font-bold mb-2">VERIFICATION REQUIRED</h3>
                                            <p className="text-white/60 text-sm mb-8">
                                                A secure uplink link has been sent to <span className="text-white font-mono">{formData.email}</span>.
                                                <br />Please verify your identity to proceed.
                                            </p>

                                            <div className="space-y-4 w-full">
                                                <button
                                                    onClick={handleResendEmail}
                                                    disabled={resendTimer > 0}
                                                    className="btn-neon w-full h-10 text-xs font-bold flex items-center justify-center gap-2"
                                                >
                                                    {resendTimer > 0 ? `RESEND IN ${resendTimer}s` : 'RESEND VERIFICATION'}
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setIsVerificationSent(false)
                                                        setIsLogin(true)
                                                    }}
                                                    className="w-full text-white/40 hover:text-white text-xs font-mono transition-colors"
                                                >
                                                    ← BACK TO LOGIN
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}


                                    {/* --- LOGIN MODE --- */}
                                    {isLogin && (
                                        <div className="space-y-2.5">
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    placeholder="Email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner"
                                                    autoComplete="email"
                                                    required
                                                />
                                            </div>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    name="password"
                                                    placeholder="Password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner"
                                                    autoComplete="current-password"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors p-1">
                                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-white/50 mb-0.5 font-medium px-1">
                                                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                                                    <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} className="rounded bg-white/10 border-white/20 w-3.5 h-3.5 text-titan-purple focus:ring-0 checked:bg-titan-purple" />
                                                    Remember me
                                                </label>
                                                <Link to="/forgot-password" className="hover:text-titan-cyan transition-colors">Forgot Password?</Link>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="btn-neon w-full mt-2 h-10 flex items-center justify-center gap-2 text-sm tracking-widest font-bold uppercase"
                                            >
                                                {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <>ENTER ARENA <ArrowRight size={16} /></>}
                                            </button>
                                        </div>
                                    )}


                                    {/* --- REGISTER: Stepper Wrapper --- */}
                                    {!isLogin && (
                                        <Stepper
                                            initialStep={1}
                                            onStepChange={(s) => setCurrentStep(s)}
                                            onFinalStepCompleted={handleRegistrationComplete}
                                            onBeforeNext={handleBeforeNextStep}
                                            backButtonText="BACK"
                                            nextButtonText="NEXT"
                                            stepCircleContainerClassName="shadow-none mb-2"
                                            contentClassName="p-0"
                                            footerClassName="px-0 pb-0 pt-0"
                                        >
                                            <Step>
                                                <div className="space-y-2.5 animate-in fade-in slide-in-from-right-4 duration-300 pt-0.5">
                                                    {/* IGN (Gamertag) Field - NEW */}
                                                    <div className="relative group">
                                                        <Gamepad2 className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <input
                                                            type="text"
                                                            name="ign"
                                                            placeholder="Gamertag (how others will see you)"
                                                            value={formData.ign}
                                                            onChange={(e) => setFormData({ ...formData, ign: e.target.value })}
                                                            minLength={3}
                                                            maxLength={20}
                                                            pattern="[a-zA-Z0-9_]+"
                                                            className={`w-full bg-white/10 border ${ignAvailable === false ? 'border-red-500 focus:border-red-500' : (ignAvailable === true ? 'border-green-500 focus:border-green-500' : 'border-white/10')} rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner`}
                                                            autoFocus
                                                            required
                                                        />
                                                        {isCheckingIgn ? (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                                        ) : (
                                                            ignAvailable === true ? (
                                                                <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                                                            ) : ignAvailable === false ? (
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold text-xs">TAKEN</div>
                                                            ) : null
                                                        )}
                                                    </div>
                                                    <div className="relative group">
                                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <input
                                                            type="text"
                                                            name="username"
                                                            placeholder="Username (for login)"
                                                            value={formData.username}
                                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                            className={`w-full bg-white/10 border ${usernameAvailable === false ? 'border-red-500 focus:border-red-500' : (usernameAvailable === true ? 'border-green-500 focus:border-green-500' : 'border-white/10')} rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner`}
                                                            required
                                                        />
                                                        {isCheckingUsername ? (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                                        ) : (
                                                            usernameAvailable === true ? (
                                                                <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                                                            ) : usernameAvailable === false ? (
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold text-xs">TAKEN</div>
                                                            ) : null
                                                        )}
                                                    </div>
                                                    <div className="relative group">
                                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <input
                                                            type="text"
                                                            name="legalName"
                                                            placeholder="Full Legal Name"
                                                            value={formData.legalName}
                                                            onChange={handleChange}
                                                            className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <div className="relative group">
                                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                            <input
                                                                type="date"
                                                                name="dateOfBirth"
                                                                value={formData.dateOfBirth}
                                                                onChange={handleChange}
                                                                className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-2 text-white/90 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-mono text-xs uppercase shadow-inner"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="relative group">
                                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                            <select
                                                                name="country"
                                                                value={formData.country}
                                                                onChange={(e) => {
                                                                    const selectedCode = e.target.value;
                                                                    const selectedCountry = countries.find(c => c.code === selectedCode);
                                                                    const dialingCode = selectedCountry ? selectedCountry.dial_code : '';

                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        country: selectedCode,
                                                                        phone: prev.phone || dialingCode
                                                                    }));
                                                                }}
                                                                className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm appearance-none cursor-pointer shadow-inner"
                                                                required
                                                            >
                                                                <option value="" disabled className="bg-[#1a1a1a] text-white/50">Country</option>
                                                                {countries.map(country => (
                                                                    <option key={country.code} value={country.code} className="bg-[#1a1a1a] text-white">
                                                                        {country.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        {/* Phone field removed per request */}
                                                    </div>
                                                    {/* Dynamic Location Fields */}
                                                    {formData.country === 'IN' ? (
                                                        <>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <div className="relative group">
                                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                                    <select
                                                                        name="state"
                                                                        value={formData.state}
                                                                        onChange={(e) => {
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                state: e.target.value,
                                                                                city: ''
                                                                            }))
                                                                        }}
                                                                        className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm appearance-none cursor-pointer shadow-inner"
                                                                        required
                                                                    >
                                                                        <option value="" disabled className="bg-[#1a1a1a] text-white/50">State</option>
                                                                        {getAllStates().map(state => (
                                                                            <option key={state.id} value={state.state} className="bg-[#1a1a1a] text-white">
                                                                                {state.state}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="relative group">
                                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                                    <select
                                                                        name="city"
                                                                        value={formData.city}
                                                                        onChange={handleChange}
                                                                        className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm appearance-none cursor-pointer shadow-inner"
                                                                        required
                                                                        disabled={!formData.state}
                                                                    >
                                                                        <option value="" disabled className="bg-[#1a1a1a] text-white/50">District</option>
                                                                        {formData.state && getDistrictsByState(formData.state).map((district, idx) => (
                                                                            <option key={idx} value={district} className="bg-[#1a1a1a] text-white">
                                                                                {district}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-2.5">
                                                            <input
                                                                type="text"
                                                                name="state"
                                                                placeholder="State / Pro"
                                                                value={formData.state}
                                                                onChange={handleChange}
                                                                className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-white/20 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm shadow-inner"
                                                                required
                                                            />
                                                            <input
                                                                type="text"
                                                                name="city"
                                                                placeholder="City (Opt)"
                                                                value={formData.city}
                                                                onChange={handleChange}
                                                                className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-white/20 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm shadow-inner"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </Step>

                                            <Step>
                                                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300 pt-0.5">
                                                    <div className="relative group">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            placeholder="Email Address"
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                            className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner"
                                                            autoComplete="email"
                                                            autoFocus
                                                            required
                                                        />
                                                    </div>

                                                    <div className="relative group">
                                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <input
                                                            type="password"
                                                            name="password"
                                                            placeholder="Create Password"
                                                            value={formData.password}
                                                            onChange={handleChange}
                                                            className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner"
                                                            autoComplete="new-password"
                                                            required
                                                        />
                                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors p-1">
                                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    </div>

                                                    {/* Confirm Password Field - NEW */}
                                                    <div className="relative group">
                                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <input
                                                            type="password"
                                                            name="confirmPassword"
                                                            placeholder="Confirm Password"
                                                            value={formData.confirmPassword}
                                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                            className={`w-full bg-white/10 border ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500' : 'border-white/10'} rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner`}
                                                            required
                                                        />
                                                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold text-xs">NO MATCH</div>
                                                        )}
                                                    </div>

                                                    {/* Region Selector - NEW */}
                                                    <div className="relative group">
                                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <select
                                                            name="region"
                                                            value={formData.region}
                                                            onChange={handleRegionChange}
                                                            className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm appearance-none cursor-pointer shadow-inner"
                                                            required
                                                        >
                                                            <option value="" disabled className="bg-[#1a1a1a] text-white/50">Select Region *</option>
                                                            <option value="1" className="bg-[#1a1a1a] text-white">Asia</option>
                                                            <option value="2" className="bg-[#1a1a1a] text-white">Europe</option>
                                                            <option value="3" className="bg-[#1a1a1a] text-white">Africa</option>
                                                            <option value="4" className="bg-[#1a1a1a] text-white">North America</option>
                                                            <option value="5" className="bg-[#1a1a1a] text-white">South America</option>
                                                            <option value="6" className="bg-[#1a1a1a] text-white">Oceania</option>
                                                        </select>
                                                    </div>
                                                    <p className="text-white/40 text-xs font-mono -mt-1">Region affects matchmaking & notifications. You can still join tournaments from other regions.</p>

                                                    {/* Sub-Region Selector - NEW (Optional) */}
                                                    <div className="relative group">
                                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <select
                                                            name="subRegion"
                                                            value={formData.subRegion}
                                                            onChange={(e) => setFormData({ ...formData, subRegion: e.target.value })}
                                                            disabled={!formData.region}
                                                            className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm appearance-none cursor-pointer shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <option value="" className="bg-[#1a1a1a] text-white/50">Sub-Region (Auto)</option>
                                                            {/* Sub-regions will be populated based on selected region */}
                                                        </select>
                                                    </div>

                                                    <label className="flex items-start gap-3 cursor-pointer group mt-3 bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                                                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all duration-300 flex-shrink-0 ${formData.termsAccepted ? 'bg-titan-cyan border-titan-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'border-white/30 group-hover:border-white/50 bg-black/50'}`}>
                                                            {formData.termsAccepted && <Check size={12} className="text-black stroke-[3]" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            name="termsAccepted"
                                                            checked={formData.termsAccepted}
                                                            onChange={handleChange}
                                                            className="hidden"
                                                        />
                                                        <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors leading-tight select-none">
                                                            I ACKNOWLEDGE THE <span className="text-titan-cyan font-bold">PROTOCOLS</span> (TERMS).
                                                            <br />
                                                            <span className="text-white/30">Biometric Age &ge; 13 Confirmed.</span>
                                                        </span>
                                                    </label>
                                                </div>
                                            </Step>
                                        </Stepper>
                                    )}


                                </form>

                                <div className="mt-4 text-center border-t border-white/5 pt-3 relative z-20">
                                    <p className="text-white/30 text-xs font-mono mb-1">
                                        {isLogin ? "NO IDENTITY FOUND?" : "IDENTITY EXISTS?"}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsLogin(!isLogin)}
                                        className="text-titan-cyan hover:text-white transition-colors font-display font-bold tracking-wider text-sm uppercase border-b border-transparent hover:border-titan-cyan pb-1"
                                    >
                                        {isLogin ? 'CREATE NEW PROFILE' : 'ACCESS EXISTING PROFILE'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
