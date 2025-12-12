import { useEffect, useState, useMemo } from 'react';
import './Counter.css';
import { motion, AnimatePresence } from 'framer-motion';

const RollingDigit = ({ value, fontSize = 24, color = 'white' }) => {
    // value is a digit 0-9
    return (
        <div
            className="counter-counter relative"
            style={{
                height: fontSize * 1.2,
                width: fontSize * 0.6,
                fontSize,
                color
            }}
        >
            <motion.div
                className="absolute top-0 left-0 w-full flex flex-col items-center"
                initial={false}
                animate={{ y: -value * fontSize * 1.2 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
            >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div
                        key={num}
                        className="counter-number flex items-center justify-center font-bold font-mono"
                        style={{ height: fontSize * 1.2, width: '100%' }}
                    >
                        {num}
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

const Countdown = ({
    targetDate,
    label,
    fontSize = 16,
    color = '#A855F7' // titan-purple
}) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const diff = target - now;
            setTimeLeft(Math.max(0, diff));
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    const formatData = useMemo(() => {
        const seconds = Math.floor((timeLeft / 1000) % 60);
        const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
        const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

        return { days, hours, minutes, seconds, totalHours: Math.floor(timeLeft / (1000 * 60 * 60)) };
    }, [timeLeft]);

    if (timeLeft <= 0) return <span className="text-white/60 font-mono">Ended</span>;

    // > 24 Hours format: "X days Y hours"
    if (formatData.days >= 1) {
        return (
            <div className="flex flex-col items-start">
                {label && <span className="text-[10px] text-white/50 mb-1 uppercase tracking-wider">{label}</span>}
                <div className="flex items-baseline gap-2">
                    <span className="flex items-center gap-1">
                        <span className="font-bold font-mono text-white text-lg">{formatData.days}</span>
                        <span className="text-xs text-white/50">days</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="font-bold font-mono text-white text-lg">{formatData.hours}</span>
                        <span className="text-xs text-white/50">hours</span>
                    </span>
                </div>
            </div>
        );
    }

    // < 24 Hours format: "HH : MM : SS" (Rolling)
    // We break down hours, mins, secs into digits
    const getDigits = (num) => [Math.floor(num / 10), num % 10];

    // If < 24h, formatData.hours is correct (0-23)
    const hDigits = getDigits(formatData.hours);
    const mDigits = getDigits(formatData.minutes);
    const sDigits = getDigits(formatData.seconds);

    return (
        <div className="flex flex-col items-start">
            {label && <span className="text-[10px] text-white/50 mb-1 uppercase tracking-wider">{label}</span>}
            <div className="flex items-center gap-1">
                {/* Hours */}
                <div className="flex bg-black/40 rounded px-1 py-0.5 border border-white/10">
                    <RollingDigit value={hDigits[0]} fontSize={fontSize} color={color} />
                    <RollingDigit value={hDigits[1]} fontSize={fontSize} color={color} />
                </div>
                <span className="text-white/40 font-bold" style={{ fontSize }}>:</span>

                {/* Minutes */}
                <div className="flex bg-black/40 rounded px-1 py-0.5 border border-white/10">
                    <RollingDigit value={mDigits[0]} fontSize={fontSize} color={color} />
                    <RollingDigit value={mDigits[1]} fontSize={fontSize} color={color} />
                </div>
                <span className="text-white/40 font-bold" style={{ fontSize }}>:</span>

                {/* Seconds */}
                <div className="flex bg-black/40 rounded px-1 py-0.5 border border-white/10">
                    <RollingDigit value={sDigits[0]} fontSize={fontSize} color={color} />
                    <RollingDigit value={sDigits[1]} fontSize={fontSize} color={color} />
                </div>
            </div>
        </div>
    );
};

export default Countdown;
