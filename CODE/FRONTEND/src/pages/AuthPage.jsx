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
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false) // NEW: Reset Password Modal

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
        identifier: '', // Login field (Email or Username)
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
            identifier: '',
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

    // Resend Email Timer
    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleResendEmail = async () => {
        if (resendTimer > 0) return;

        try {
            await api.post('/auth/resend-verification', {
                email: formData.email
            });
            toast.success('Verification code resent!');
            setResendTimer(60); // 60s cooldown
        } catch (error) {
            console.error('Resend failed:', error);
            // Ignore "No active session" if it happens, assuming backend might not require auth for this specific flow if email is provided
            // But wait, resendVerification typically requires auth OR email in body.
            // Let's check backend implementation.
            toast.error(error.response?.data?.message || 'Failed to resend code');
        }
    };

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

    // Validation before advancing to next step
    const handleBeforeNextStep = async (stepCalled) => {
        if (stepCalled === 1) {
            if (!formData.username || !formData.legalName || !formData.dateOfBirth || !formData.country || !formData.state) {
                toast.error('Please fill in all personal details')
                return false
            }
            return true
        }

        // Step 2 → Step 3: Trigger signup and send OTP
        if (stepCalled === 2) {
            if (!formData.termsAccepted) {
                toast.error('Accept terms to proceed')
                return false
            }

            // Frontend validation
            if (formData.password !== formData.confirmPassword) {
                toast.error("Passwords don't match")
                return false
            }

            // Block if checking IGN
            if (isCheckingIgn) {
                toast.error("Please wait for gamertag availability check")
                return false
            }

            // Check IGN is available
            if (ignAvailable === false) {
                toast.error("Gamertag is already taken")
                return false
            }

            setIsAuthProcessing(true)
            try {
                // Prepare payload
                const payload = {
                    ign: formData.ign.trim(),
                    username: formData.username,
                    legalName: formData.legalName,
                    email: formData.email,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword,
                    phone: formData.phone || '',
                    region: Number(formData.region),
                    subRegion: formData.subRegion || '',
                    country: formData.country,
                    state: formData.state,
                    city: formData.city || '',
                    dateOfBirth: formData.dateOfBirth,
                    termsAccepted: formData.termsAccepted
                }

                console.log('Sending payload:', payload)

                // Call custom backend signup
                const response = await api.post('/auth/signup', payload)

                // toast.success('Verification code sent to your email!')
                setIsAuthProcessing(false)
                return true // Allow advancing to Step 3
            } catch (error) {
                console.error('Signup Failed:', error)
                console.error('Error response:', error.response?.data)

                // Show detailed validation errors if available
                if (error.response?.data?.errors) {
                    console.error('Validation errors:', error.response.data.errors)
                    error.response.data.errors.forEach((err, index) => {
                        console.error(`Error ${index + 1}:`, err)
                        toast.error(err.message || err)
                    })
                } else {
                    toast.error(error.response?.data?.message || 'Registration failed')
                }
                setIsAuthProcessing(false)
                return false // Don't advance to Step 3
            }
        }

        return true
    }

    const handleRegistrationComplete = async () => {
        // Step 3 complete: Verify OTP
        const otpInput = document.querySelector('input[name="otp"]');
        const otp = otpInput?.value;

        if (!otp || otp.length !== 6) {
            toast.error('Please enter the 6-digit verification code');
            return;
        }

        setIsAuthProcessing(true);
        try {
            // Call backend to verify OTP
            const response = await api.post('/auth/verify-email', {
                email: formData.email,
                otp: otp
            });

            toast.success('Registration complete! Redirecting to login...');

            // Wait 1 second then redirect to login
            setTimeout(() => {
                setIsLogin(true); // Switch to login mode
                // Reset form
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
                });
            }, 1000);
        } catch (error) {
            console.error('OTP Verification Failed:', error);
            toast.error(error.response?.data?.message || 'Invalid verification code');
        } finally {
            setIsAuthProcessing(false);
        }
    }

    const [isAuthProcessing, setIsAuthProcessing] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        const { auth } = await import('../lib/firebase')
        const { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, setPersistence, browserLocalPersistence, browserSessionPersistence } = await import('firebase/auth')

        if (isLogin) {
            // --- FIREBASE LOGIN (Email/Password) ---
            if (!formData.identifier || !formData.password) return toast.error('Email/Username and password required')

            setIsAuthProcessing(true)
            try {
                // 1. Resolve Email
                let loginEmail = formData.identifier;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(loginEmail)) {
                    try {
                        const lookupRes = await api.post('/auth/lookup-email', { username: formData.identifier });
                        loginEmail = lookupRes.data.email;
                    } catch (err) {
                        if (err.response?.status === 404) throw new Error('User not found');
                        throw err;
                    }
                }

                // 2. Set Persistence (Remember Me)
                await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

                // 3. Sign In
                const userCredential = await signInWithEmailAndPassword(auth, loginEmail, formData.password)
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
            // Registration is now handled in handleBeforeNextStep (Step 2 → Step 3)
            // This section is no longer used
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

    // Check for Password Reset Mode
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const mode = queryParams.get('mode');
        const oobCode = queryParams.get('oobCode');

        if (mode === 'resetPassword' && oobCode) {
            setIsResetPasswordOpen(true);
        }
    }, [location.search]);

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-titan-purple/30 font-sans overflow-hidden relative">
            {/* Navbar Re-integrated */}
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            {/* Main Content Split - Account for Navbar height with pt-20 */}
            <div className="flex-1 flex pt-20 min-h-screen">

                {/* LEFT SIDE: BANNER / SLIDESHOW (Hidden on mobile/tablet) */}
                <div className="hidden xl:flex xl:w-1/2 relative bg-titan-bg-light overflow-hidden items-center justify-center p-12 border-r border-white/5">
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
                <div className="w-full xl:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative">

                    {/* Mobile/Tablet Background (shows when not xl) */}
                    <div className="absolute inset-0 xl:hidden bg-[#050505]">
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
                                    {isLogin ? 'Access the mainframe.' : (currentStep === 1 ? 'Establish personal profile.' : currentStep === 2 ? 'Secure credentials.' : 'Verify identity.')}
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-2 relative z-10" noValidate>

                                    {/* --- LOGIN MODE --- */}
                                    {isLogin && (
                                        <div className="space-y-2.5">
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                <input
                                                    type="text"
                                                    name="identifier"
                                                    placeholder="Email or Username"
                                                    value={formData.identifier}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner"
                                                    autoComplete="username"
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
                                                <button type="button" onClick={() => setIsForgotPasswordOpen(true)} className="hover:text-titan-cyan transition-colors">Forgot Password?</button>
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
                                                    <p className="text-white/40 text-xs font-mono -mt-1">3-20 characters, any characters allowed</p>
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
                                                    {/* Phone Number Field */}
                                                    <div className="relative group">
                                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <input
                                                            type="tel"
                                                            name="phone"
                                                            placeholder="Phone Number (with country code, e.g. +919876543210)"
                                                            value={formData.phone}
                                                            onChange={handleChange}
                                                            className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner"
                                                            required
                                                        />
                                                    </div>
                                                    <p className="text-white/40 text-xs font-mono -mt-1">Required: For account recovery and important notifications</p>
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

                                            {/* Step 3: Email Verification */}
                                            <Step>
                                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pt-0.5">
                                                    <div className="text-center mb-6">
                                                        <div className="w-16 h-16 rounded-full bg-titan-purple/20 flex items-center justify-center mb-4 mx-auto animate-pulse">
                                                            <Mail size={32} className="text-titan-purple" />
                                                        </div>
                                                        <h3 className="font-display text-lg font-bold mb-2">VERIFICATION REQUIRED</h3>
                                                        <p className="text-white/60 text-sm">
                                                            A secure verification code has been sent to<br />
                                                            <span className="text-white font-mono">{formData.email}</span>
                                                        </p>
                                                    </div>

                                                    <div className="relative group">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <input
                                                            type="text"
                                                            name="otp"
                                                            placeholder="Enter 6-digit code"
                                                            maxLength={6}
                                                            className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-mono text-lg tracking-widest text-center shadow-inner"
                                                            autoFocus
                                                        />
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={handleResendEmail}
                                                        disabled={resendTimer > 0}
                                                        className="w-full text-white/40 hover:text-white text-xs font-mono transition-colors disabled:opacity-50"
                                                    >
                                                        {resendTimer > 0 ? `RESEND IN ${resendTimer}s` : 'RESEND CODE'}
                                                    </button>

                                                    <p className="text-white/40 text-xs font-mono text-center">
                                                        Check your email inbox and spam folder
                                                    </p>
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

            {/* --- FORGOT PASSWORD MODAL --- */}
            <AnimatePresence>
                {isForgotPasswordOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-[#0a0a0a] border border-white/10 rounded-xl max-w-md w-full p-6 relative shadow-2xl shadow-titan-purple/20"
                        >
                            <button
                                onClick={() => setIsForgotPasswordOpen(false)}
                                className="absolute right-4 top-4 text-white/30 hover:text-white transition-colors"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            <h3 className="text-xl font-bold font-display text-white mb-2">Recover Access</h3>
                            <p className="text-white/50 text-sm mb-6">Enter your email address to receive a password reset link.</p>

                            <ForgotPasswordForm onSuccess={() => setIsForgotPasswordOpen(false)} />

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- RESET PASSWORD MODAL (From Email Link) --- */}
            <AnimatePresence>
                {isResetPasswordOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-[#0a0a0a] border border-white/10 rounded-xl max-w-md w-full p-8 relative shadow-2xl shadow-titan-cyan/20 ring-1 ring-titan-cyan/30"
                        >
                            <h3 className="text-2xl font-bold font-display text-white mb-2 text-center">Set New Password</h3>
                            <p className="text-white/50 text-sm mb-6 text-center">Secure your account with a fresh password.</p>

                            <ResetPasswordForm
                                onSuccess={() => {
                                    setIsResetPasswordOpen(false);
                                    navigate('/auth', { replace: true });
                                    toast.success('Password updated! Please login.');
                                }}
                            />

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function ResetPasswordForm({ onSuccess }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword.length < 8) return toast.error('Password too short (min 8 chars)');
        if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

        const queryParams = new URLSearchParams(location.search);
        const oobCode = queryParams.get('oobCode');

        if (!oobCode) return toast.error('Invalid reset link. Please request a new one.');

        setIsLoading(true);
        try {
            const { auth } = await import('../lib/firebase'); // Lazy load
            const { confirmPasswordReset } = await import('firebase/auth');

            await confirmPasswordReset(auth, oobCode, newPassword);

            onSuccess();
        } catch (error) {
            console.error('Reset Confirm Error:', error);
            const msg = error.code === 'auth/invalid-action-code' ? 'Expired or invalid link.' : error.message;
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">New Password</label>
                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-cyan/50 transition-all font-sans text-sm"
                    placeholder="Min 8 characters"
                    required
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Confirm Password</label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-cyan/50 transition-all font-sans text-sm"
                    placeholder="Re-enter password"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-titan-cyan hover:bg-titan-cyan/80 text-black font-bold py-3 rounded-lg transition-all mt-4"
            >
                {isLoading ? 'Updating...' : 'Update Password'}
            </button>
        </form>
    )
}

function ForgotPasswordForm({ onSuccess }) {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)

    const handleReset = async (e) => {
        e.preventDefault()
        setError('')

        if (!email) {
            setError('Email is required')
            return
        }

        // Manual validation since native is disabled
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address')
            return
        }

        setIsLoading(true)
        try {
            // Use custom backend endpoint for branded email
            await api.post('/auth/trigger-password-reset', { email: email.trim() })

            setIsSent(true)
            setTimeout(() => {
                onSuccess()
            }, 3000)
        } catch (error) {
            console.error('Reset Error:', error)
            setError(error.response?.data?.message || 'Failed to send reset link')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSent) {
        return (
            <div className="text-center py-4 space-y-3">
                <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                    <Check size={24} />
                </div>
                <p className="text-white font-medium">Link Sent!</p>
                <p className="text-white/40 text-xs">Check your inbox. Closing in 3s...</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
            <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Email Address</label>
                <div className="relative group">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-500' : 'text-white/40 group-focus-within:text-titan-cyan'}`} size={16} />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value)
                            if (error) setError('')
                        }}
                        placeholder="Enter your registered email"
                        className={`w-full bg-white/5 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-titan-purple/50'} rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:bg-white/10 transition-all font-sans text-sm`}
                        autoFocus
                        required
                    />
                </div>
                {error && (
                    <p className="text-red-500 text-xs font-medium pl-1 animate-in slide-in-from-left-1">{error}</p>
                )}
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="btn-neon w-full h-10 flex items-center justify-center gap-2 text-sm tracking-widest font-bold uppercase"
            >
                {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <>Send Link <ArrowRight size={16} /></>}
            </button>
        </form >
    )
}
