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
import { AsYouType } from 'libphonenumber-js'
import { getAllStates, getDistrictsByState } from '../lib/india-locations';

export default function AuthPage() {

    const [isLogin, setIsLogin] = useState(true)
    const [isVerifying, setIsVerifying] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)

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
        username: '',
        email: '',
        password: '',
        legalName: '',
        dateOfBirth: '',
        phone: '',
        country: '',
        state: '',
        city: '',
        termsAccepted: false
    })

    const [otp, setOtp] = useState('')

    const { login, signup, verifyEmail, isLoading } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const from = location.state?.from?.pathname || '/'

    // Clear form when switching between login/signup
    useEffect(() => {
        setFormData({
            username: '',
            email: '',
            password: '',
            legalName: '',
            dateOfBirth: '',
            phone: '',
            country: '',
            state: '',
            city: '',
            termsAccepted: false
        })
        setIsVerifying(false)
        setOtp('')
        setCurrentStep(1)
    }, [isLogin])

    const handleBeforeNextStep = async (stepCalled) => {
        if (stepCalled === 1) {
            if (!formData.username || !formData.legalName || !formData.dateOfBirth || !formData.phone || !formData.country || !formData.state) {
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

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (isVerifying) {
            // Handle OTP Verification
            const result = await verifyEmail(formData.email, otp)
            if (result.success) {
                toast.success('Email verified! Logging you in...')
                navigate(from, { replace: true })
            } else {
                toast.error(result.message)
            }
            return
        }

        if (isLogin) {
            const result = await login(formData.email, formData.password, rememberMe)
            if (result.success) {
                toast.success('Welcome back to the Arena!')
                navigate(from, { replace: true })
            } else {
                toast.error(result.message)
            }
        } else {
            // Handle Register Final Step
            if (!formData.termsAccepted) {
                toast.error('You must accept the terms and conditions')
                return
            }

            const result = await signup(formData)

            if (result.success) {
                toast.success('Verification code sent! Please check your email.')
                setIsVerifying(true)
                // Effectively move to "Step 3" visually, which is the Verification UI
            } else {
                toast.error(result.message)
            }
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
                                    {isVerifying ? 'Verifying Identity' : (isLogin ? 'Welcome Back' : 'Sign Up')}
                                </h2>

                                <p className="text-white/40 text-sm mb-2 font-mono leading-relaxed">
                                    {isVerifying
                                        ? 'Aligning biometrics...'
                                        : (isLogin ? 'Access the mainframe.' : (currentStep === 1 ? 'Establish personal profile.' : 'Secure credentials.'))
                                    }
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-2 relative z-10">

                                    {/* --- LOGIN MODE --- */}
                                    {isLogin && !isVerifying && (
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
                                    {!isLogin && !isVerifying && (
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
                                                    <div className="relative group">
                                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                        <input
                                                            type="text"
                                                            name="username"
                                                            placeholder="Gamertag / Username"
                                                            value={formData.username}
                                                            onChange={handleChange}
                                                            className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner"
                                                            autoFocus
                                                            required
                                                        />
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
                                                        <div className="relative group col-span-2">
                                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-titan-cyan transition-colors" size={16} />
                                                            <input
                                                                type="tel"
                                                                name="phone"
                                                                placeholder="Phone Number"
                                                                value={formData.phone}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const isoCode = formData.country || undefined;
                                                                    const formatted = new AsYouType(isoCode).input(val);
                                                                    setFormData(prev => ({ ...prev, phone: formatted }));
                                                                }}
                                                                className="w-full bg-white/10 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 focus:bg-white/15 transition-all font-sans text-sm tracking-wide shadow-inner"
                                                                required
                                                            />
                                                        </div>
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

                                    {/* --- VERIFICATION STEP (OTP) --- */}
                                    {isVerifying && (
                                        <div className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="relative group">
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-titan-purple to-titan-cyan rounded-lg blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
                                                <input
                                                    type="text"
                                                    placeholder="XXXXXX"
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    className="relative w-full bg-black/80 border border-white/10 text-center text-3xl tracking-[0.8em] font-mono py-3 rounded-lg text-titan-cyan focus:outline-none focus:border-titan-cyan/50 focus:text-white transition-all placeholder-white/10"
                                                    autoComplete="off"
                                                    required
                                                    maxLength={6}
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="text-xs text-white/40 font-mono">
                                                SIGNAL LOST? <button type="button" className="text-titan-purple hover:text-white transition-colors underline decoration-dotted underline-offset-4">RESEND UPLINK</button>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="btn-neon w-full mt-2 h-10 flex items-center justify-center gap-2"
                                            >
                                                {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'AUTHENTICATE'}
                                            </button>
                                        </div>
                                    )}

                                </form>

                                {!isVerifying && (
                                    <div className="mt-4 text-center border-t border-white/5 pt-3 relative z-20">
                                        <p className="text-white/30 text-xs font-mono mb-1">
                                            {isLogin ? "NO IDENTITY FOUND?" : "IDENTITY EXISTS?"}
                                        </p>
                                        <button
                                            onClick={() => setIsLogin(!isLogin)}
                                            className="text-titan-cyan hover:text-white transition-colors font-display font-bold tracking-wider text-sm uppercase border-b border-transparent hover:border-titan-cyan pb-1"
                                        >
                                            {isLogin ? 'CREATE NEW PROFILE' : 'ACCESS EXISTING PROFILE'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
