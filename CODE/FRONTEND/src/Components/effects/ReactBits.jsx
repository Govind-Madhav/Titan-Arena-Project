/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

/**
 * Particles - Floating particle effect background
 */
export function Particles({
    count = 50,
    color = '#8B5CF6',
    size = { min: 1, max: 4 },
    speed = { min: 0.5, max: 2 },
    className = ''
}) {
    const canvasRef = useRef(null)
    const particlesRef = useRef([])
    const animationRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        let width = canvas.offsetWidth
        let height = canvas.offsetHeight

        const resize = () => {
            width = canvas.offsetWidth
            height = canvas.offsetHeight
            canvas.width = width
            canvas.height = height
        }

        const createParticles = () => {
            particlesRef.current = []
            for (let i = 0; i < count; i++) {
                particlesRef.current.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: size.min + Math.random() * (size.max - size.min),
                    speedX: (Math.random() - 0.5) * speed.max,
                    speedY: (Math.random() - 0.5) * speed.max,
                    opacity: 0.2 + Math.random() * 0.5,
                })
            }
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height)

            particlesRef.current.forEach((p) => {
                p.x += p.speedX
                p.y += p.speedY

                if (p.x < 0) p.x = width
                if (p.x > width) p.x = 0
                if (p.y < 0) p.y = height
                if (p.y > height) p.y = 0

                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fillStyle = color.replace(')', `, ${p.opacity})`).replace('rgb', 'rgba')
                ctx.fill()
            })

            animationRef.current = requestAnimationFrame(animate)
        }

        resize()
        createParticles()
        animate()

        window.addEventListener('resize', resize)

        return () => {
            window.removeEventListener('resize', resize)
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [count, color, size, speed])

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 pointer-events-none ${className}`}
            style={{ opacity: 0.6 }}
        />
    )
}

/**
 * Target Cursor - Custom cursor that follows with lag
 */
export function TargetCursor({
    color = '#8B5CF6',
    size = 20,
    ringSize = 40,
    smoothing = 0.15
}) {
    const cursorRef = useRef(null)
    const ringRef = useRef(null)
    const position = useRef({ x: 0, y: 0 })
    const targetPosition = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const handleMouseMove = (e) => {
            targetPosition.current = { x: e.clientX, y: e.clientY }
        }

        const animate = () => {
            position.current.x += (targetPosition.current.x - position.current.x) * smoothing
            position.current.y += (targetPosition.current.y - position.current.y) * smoothing

            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate(${targetPosition.current.x - size / 2}px, ${targetPosition.current.y - size / 2}px)`
            }
            if (ringRef.current) {
                ringRef.current.style.transform = `translate(${position.current.x - ringSize / 2}px, ${position.current.y - ringSize / 2}px)`
            }

            requestAnimationFrame(animate)
        }

        window.addEventListener('mousemove', handleMouseMove)
        animate()

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
        }
    }, [size, ringSize, smoothing])

    return (
        <>
            {/* Inner dot */}
            <div
                ref={cursorRef}
                className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
                style={{
                    width: size,
                    height: size,
                    backgroundColor: color,
                    borderRadius: '50%',
                }}
            />
            {/* Outer ring */}
            <div
                ref={ringRef}
                className="fixed top-0 left-0 pointer-events-none z-[9998]"
                style={{
                    width: ringSize,
                    height: ringSize,
                    border: `2px solid ${color}`,
                    borderRadius: '50%',
                    opacity: 0.5,
                }}
            />
        </>
    )
}

/**
 * Scroll Stack - Cards that stack/unstack on scroll
 */
export function ScrollStack({ children, className = '' }) {
    return (
        <div className={`relative ${className}`}>
            {children.map((child, index) => (
                <motion.div
                    key={index}
                    className="sticky top-24"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, margin: '-100px' }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    style={{
                        zIndex: children.length - index,
                    }}
                >
                    <div
                        className="glass-card p-6 mb-4"
                        style={{
                            transform: `scale(${1 - index * 0.02})`,
                            transformOrigin: 'top center',
                        }}
                    >
                        {child}
                    </div>
                </motion.div>
            ))}
        </div>
    )
}

/**
 * Card Nav - Animated card-based navigation
 */
export function CardNav({ items, activeIndex, onChange, className = '' }) {
    return (
        <div className={`flex gap-2 ${className}`}>
            {items.map((item, index) => (
                <motion.button
                    key={index}
                    onClick={() => onChange(index)}
                    className={`relative px-6 py-3 rounded-xl font-heading font-semibold transition-all duration-300 ${activeIndex === index
                            ? 'text-white'
                            : 'text-white/60 hover:text-white/80'
                        }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {activeIndex === index && (
                        <motion.div
                            layoutId="card-nav-active"
                            className="absolute inset-0 bg-gradient-to-r from-titan-purple to-titan-blue rounded-xl"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            style={{ zIndex: -1 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                        {item.icon && <item.icon size={18} />}
                        {item.label}
                    </span>
                </motion.button>
            ))}
        </div>
    )
}

/**
 * Spotlight Card - Card with spotlight effect on hover
 */
export function SpotlightCard({ children, className = '' }) {
    const cardRef = useRef(null)

    const handleMouseMove = useCallback((e) => {
        const card = cardRef.current
        if (!card) return

        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        card.style.setProperty('--mouse-x', `${x}px`)
        card.style.setProperty('--mouse-y', `${y}px`)
    }, [])

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            className={`relative overflow-hidden glass-card group ${className}`}
            style={{
                '--mouse-x': '50%',
                '--mouse-y': '50%',
            }}
        >
            {/* Spotlight effect */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(139, 92, 246, 0.15), transparent 40%)`,
                }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    )
}

/**
 * Magnetic Button - Button that pulls cursor toward it
 */
export function MagneticButton({ children, className = '', strength = 0.3 }) {
    const buttonRef = useRef(null)

    const handleMouseMove = (e) => {
        const button = buttonRef.current
        if (!button) return

        const rect = button.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        const deltaX = (e.clientX - centerX) * strength
        const deltaY = (e.clientY - centerY) * strength

        button.style.transform = `translate(${deltaX}px, ${deltaY}px)`
    }

    const handleMouseLeave = () => {
        const button = buttonRef.current
        if (button) {
            button.style.transform = 'translate(0, 0)'
        }
    }

    return (
        <motion.button
            ref={buttonRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`transition-transform duration-200 ${className}`}
            whileTap={{ scale: 0.95 }}
        >
            {children}
        </motion.button>
    )
}

/**
 * Tilted Card - 3D tilt effect on hover
 */
export function TiltedCard({ children, className = '', maxTilt = 10 }) {
    const cardRef = useRef(null)

    const handleMouseMove = (e) => {
        const card = cardRef.current
        if (!card) return

        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2

        const rotateX = ((y - centerY) / centerY) * -maxTilt
        const rotateY = ((x - centerX) / centerX) * maxTilt

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
    }

    const handleMouseLeave = () => {
        const card = cardRef.current
        if (card) {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)'
        }
    }

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`transition-transform duration-200 ${className}`}
            style={{ transformStyle: 'preserve-3d' }}
        >
            {children}
        </div>
    )
}

/**
 * Gradient Text - Animated gradient text
 */
export function GradientText({ children, className = '' }) {
    return (
        <span
            className={`bg-gradient-to-r from-titan-purple via-titan-blue to-titan-cyan bg-clip-text text-transparent bg-[length:200%_auto] animate-aurora ${className}`}
        >
            {children}
        </span>
    )
}

/**
 * Glow Border - Animated glowing border
 */
export function GlowBorder({ children, className = '' }) {
    return (
        <div className={`relative p-[2px] rounded-xl overflow-hidden ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-titan-purple via-titan-blue to-titan-purple bg-[length:200%_auto] animate-aurora" />
            <div className="relative bg-titan-bg-card rounded-xl">
                {children}
            </div>
        </div>
    )
}
