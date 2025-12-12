/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import './TargetCursor.css';

const TargetCursor = ({
    targetSelector = '.cursor-target',
    spinDuration = 2,
    hideDefaultCursor = true,
    hoverDuration = 0.3,
}) => {
    const cursorRef = useRef(null);
    const dotRef = useRef(null);
    const cornersRef = useRef(null);
    const spinTl = useRef(null);
    const activeTargetRef = useRef(null);

    const isMobile = useMemo(() => {
        if (typeof window === 'undefined') return true;
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        return hasTouchScreen && isSmallScreen;
    }, []);

    // Initial setup
    useEffect(() => {
        if (isMobile || !cursorRef.current) return;

        const originalCursor = document.body.style.cursor;
        if (hideDefaultCursor) {
            document.body.style.cursor = 'none';
        }

        const cursor = cursorRef.current;
        const corners = cursor.querySelectorAll('.target-cursor-corner');
        cornersRef.current = corners;

        // Center initially
        gsap.set(cursor, {
            xPercent: -50,
            yPercent: -50,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        });

        // Spin animation
        const createSpin = () => {
            spinTl.current = gsap.timeline({ repeat: -1 })
                .to(cursor, { rotation: 360, duration: spinDuration, ease: 'none' });
        };
        createSpin();

        // Mouse Move Handler
        const onMouseMove = (e) => {
            if (activeTargetRef.current) return; // Don't follow mouse if locked on target

            gsap.to(cursor, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.1,
                ease: 'power3.out'
            });
        };

        // Hover Handlers
        const onMouseOver = (e) => {
            const target = e.target.closest(targetSelector);
            if (target && target !== activeTargetRef.current) {
                // Lock onto target
                activeTargetRef.current = target;

                // Get rect
                const rect = target.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Stop spin
                spinTl.current?.pause();
                gsap.to(cursor, { rotation: 0, duration: 0.3 });

                // Move cursor to center of target
                gsap.to(cursor, {
                    x: centerX,
                    y: centerY,
                    duration: hoverDuration,
                    ease: 'expo.out'
                });

                // Expand corners to match rect size
                // We assume corners are absolutely positioned from center.
                // tl: -x, -y | tr: +x, -y | br: +x, +y | bl: -x, +y
                // We need to move them by half width/height + padding
                const padding = 10;
                const halfW = rect.width / 2 + padding;
                const halfH = rect.height / 2 + padding;

                const dists = [
                    { x: -halfW, y: -halfH }, // Top Left
                    { x: halfW, y: -halfH },  // Top Right
                    { x: halfW, y: halfH },   // Bottom Right
                    { x: -halfW, y: halfH }   // Bottom Left
                ];

                corners.forEach((corner, i) => {
                    gsap.to(corner, {
                        x: dists[i].x, // Relative to center
                        y: dists[i].y,
                        // Reset transforms that might be set by CSS (corner-tl etc uses translate(-150%...))
                        // We need to override those. Or better, we animate 'left/top' or just 'x/y' on top of it?
                        // The CSS uses transform: translate(...) for initial state. GSAP overwrites transform.
                        // So we just set x/y. 
                        // BUT wait: standard corner css is: transform: translate(-150%, -150%).
                        // If we gsap.to(x, y), we LOSE that offset if we aren't careful?
                        // Actually, let's just animate x and y to the calculated offsets. 
                        // Since corners are centered in wrapper (left: 50%, top: 50%), 
                        // x=-halfW means moving left by halfW. This is correct.
                        overwrite: true,
                        duration: hoverDuration,
                        ease: 'expo.out'
                    });
                });

                // Hide dot
                gsap.to(dotRef.current, { scale: 0, duration: 0.2 });
            }
        };

        const onMouseOut = (e) => {
            const target = e.target.closest(targetSelector);
            if (target && target === activeTargetRef.current) {
                activeTargetRef.current = null;

                // Resume Spin
                spinTl.current?.resume();

                // Reset dot
                gsap.to(dotRef.current, { scale: 1, duration: 0.2 });

                // Reset Corners (bring them back continuously spinning around center)
                // The CSS defines their 'resting' state via classes .corner-tl etc.
                // We need to clear GSAP values to let CSS take over? 
                // Or animate back to small box.

                // Default positions from CSS logic are roughly:
                // TL: translate(-150%, -150%) approx -18px
                // Let's just animate them to a small square.
                const offset = 10;
                const restingPos = [
                    { x: -offset, y: -offset },
                    { x: offset, y: -offset },
                    { x: offset, y: offset },
                    { x: -offset, y: offset }
                ];

                corners.forEach((corner, i) => {
                    gsap.to(corner, {
                        x: restingPos[i].x,
                        y: restingPos[i].y,
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
            }
        };

        // Scroll Handler - Update position if locked
        const onScroll = () => {
            if (activeTargetRef.current) {
                const rect = activeTargetRef.current.getBoundingClientRect();
                gsap.set(cursor, {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                });
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseover', onMouseOver);
        window.addEventListener('mouseout', onMouseOut);
        window.addEventListener('scroll', onScroll, { capture: true, passive: true });

        return () => {
            document.body.style.cursor = originalCursor;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseover', onMouseOver);
            window.removeEventListener('mouseout', onMouseOut);
            window.removeEventListener('scroll', onScroll);
            spinTl.current?.kill();
        };

    }, [isMobile, hideDefaultCursor, spinDuration, hoverDuration, targetSelector]);

    if (isMobile) return null;

    return createPortal(
        <div ref={cursorRef} className="target-cursor-wrapper">
            <div ref={dotRef} className="target-cursor-dot" />
            {/* Corners need explicit transforms resetting if we control purely via JS, 
                 but keeping classes allows initial styling */}
            <div className="target-cursor-corner" />
            <div className="target-cursor-corner" />
            <div className="target-cursor-corner" />
            <div className="target-cursor-corner" />
        </div>,
        document.body
    );
};

export default TargetCursor;
