import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Gamepad2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import { Particles, GradientText } from '../components/effects/ReactBits'

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: ''
    })

    const { login, signup, isLoading } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const from = location.state?.from?.pathname || '/dashboard'

    const handleSubmit = async (e) => {
        e.preventDefault()

        let result
        if (isLogin) {
            result = await login(formData.email, formData.password)
        } else {
            result = await signup(formData.email, formData.password, formData.username)
        }

        if (result.success) {
            toast.success(isLogin ? 'Welcome back!' : 'Account created!')
            navigate(from, { replace: true })
        } else {
            toast.error(result.message)
        }
    }

    return (
        <div className="min-h-screen bg-titan-bg flex items-center justify-center relative overflow-hidden">
            <Particles count={40} color="rgba(139, 92, 246, 1)" />

            {/* Background glow */}
            <div className="absolute inset-0 bg-neon-glow opacity-20" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md p-8"
            >
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-titan-purple to-titan-blue flex items-center justify-center shadow-neon">
                        <Gamepad2 className="text-white" size={24} />
                    </div>
                    <span className="font-display font-bold text-2xl tracking-wider">
                        TITAN <span className="text-titan-purple">ARENA</span>
                    </span>
                </Link>

                {/* Card */}
                <div className="glass-card p-8">
                    <h1 className="font-display text-2xl font-bold text-center mb-2">
                        {isLogin ? 'Welcome Back' : 'Join the Arena'}
                    </h1>
                    <p className="text-white/40 text-center mb-8">
                        {isLogin ? 'Sign in to continue' : 'Create your account'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="input-dark pl-12"
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input-dark pl-12"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="input-dark pl-12 pr-12"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {isLogin && (
                            <div className="flex justify-end">
                                <button type="button" className="text-sm text-titan-purple hover:text-titan-purple-light">
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-neon w-full flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <span className="text-white/40">
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        </span>
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-titan-purple hover:text-titan-purple-light font-semibold"
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>
                </div>

                {/* Back to home */}
                <p className="text-center mt-6 text-white/40 text-sm">
                    <Link to="/" className="hover:text-white transition-colors">
                        ← Back to home
                    </Link>
                </p>
            </motion.div>
        </div>
    )
}
