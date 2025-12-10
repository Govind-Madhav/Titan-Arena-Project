import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const StableCard = ({ 
  children, 
  className = "", 
  delay = 0, 
  animationType = "fadeIn",
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isStable, setIsStable] = useState(false);

  useEffect(() => {
    // Ensure card is stable before showing
    const timer = setTimeout(() => {
      setIsStable(true);
    }, 50);

    const visibilityTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100 + delay);

    return () => {
      clearTimeout(timer);
      clearTimeout(visibilityTimer);
    };
  }, [delay]);

  const getAnimationProps = () => {
    switch (animationType) {
      case "fadeIn":
        return {
          initial: { opacity: 0, y: 20 },
          animate: isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
          transition: { duration: 0.5, delay: delay / 1000 }
        };
      case "slideIn":
        return {
          initial: { opacity: 0, x: -50 },
          animate: isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 },
          transition: { duration: 0.6, delay: delay / 1000 }
        };
      case "scaleIn":
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 },
          transition: { duration: 0.4, delay: delay / 1000 }
        };
      default:
        return {
          initial: { opacity: 0 },
          animate: isVisible ? { opacity: 1 } : { opacity: 0 },
          transition: { duration: 0.3, delay: delay / 1000 }
        };
    }
  };

  if (!isStable) {
    return (
      <div className={`bg-gray-800/50 rounded-2xl p-6 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-700 rounded mb-4"></div>
        <div className="h-6 bg-gray-700 rounded mb-2"></div>
        <div className="h-4 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      {...getAnimationProps()}
      className={`card-container card-stable transition-card ${className}`}
      style={{
        contain: 'layout style paint',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default StableCard;
