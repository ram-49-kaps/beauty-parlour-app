
import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar } from 'lucide-react';

const LaunchCountdown = () => {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    const [isVisible, setIsVisible] = useState(true);
    const [isLive, setIsLive] = useState(false);

    // TARGET DATE: Wednesday, Feb 4th, 2026 at 11:00 AM
    const targetDate = new Date('2026-02-04T11:00:00').getTime();

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                clearInterval(interval);
                setIsLive(true);
            } else {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                setTimeLeft({ days, hours, minutes, seconds });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-stone-900 via-black to-stone-900 border-b border-white/10 text-white shadow-2xl animate-slideDown">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

                {/* LEFT: Text */}
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-full hidden sm:block">
                        <SparkleIcon className="w-4 h-4 text-emerald-400 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-emerald-400 mb-0.5">
                            {isLive ? 'Grand Opening' : 'Official Launching'}
                        </p>
                        <p className="text-xs md:text-sm font-light text-stone-300">
                            {isLive ? 'We are LIVE! Experience perfection.' : 'Wednesday, Feb 4th • 11:00 AM'}
                        </p>
                    </div>
                </div>

                {/* CENTER: Countdown */}
                {!isLive && (
                    <div className="flex items-center gap-2 md:gap-4 text-center">
                        <TimeBox value={timeLeft.days} label="Days" />
                        <span className="text-stone-600 font-light text-xl">:</span>
                        <TimeBox value={timeLeft.hours} label="Hrs" />
                        <span className="text-stone-600 font-light text-xl">:</span>
                        <TimeBox value={timeLeft.minutes} label="Mins" />
                        <span className="text-stone-600 font-light hidden md:block text-xl">:</span>
                        <TimeBox value={timeLeft.seconds} label="Secs" className="hidden md:block" />
                    </div>
                )}

                {/* RIGHT: Close */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-4 h-4 text-stone-500 hover:text-white" />
                </button>
            </div>
        </div>
    );
};

// Helper Components
const TimeBox = ({ value, label, className = '' }) => (
    <div className={`flex flex-col items-center ${className}`}>
        <span className="text-lg md:text-xl font-light tabular-nums leading-none">
            {String(value).padStart(2, '0')}
        </span>
        <span className="text-[8px] text-stone-500 uppercase tracking-widest leading-none mt-1">
            {label}
        </span>
    </div>
);

const SparkleIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
);

export default LaunchCountdown;
