import React, { useState, useEffect } from 'react';
import { Mail, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import api from '../services/api';

const LaunchCountdown = () => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isLive, setIsLive] = useState(false);

    // Notify Me State
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

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

    const handleNotifyMe = async (e) => {
        e.preventDefault();
        if (!email) return;

        try {
            setStatus('loading');
            // Call Backend API to store email
            await api.post('/auth/notify-launch', { email });

            setStatus('success');
            setEmail('');
        } catch (error) {
            console.error("Notify failed", error);
            setStatus('error');
        }
    };

    if (isLive) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-stone-950 flex flex-col items-center h-screen text-center overflow-y-auto no-scrollbar md:overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-800/20 via-stone-950 to-stone-950 pointer-events-none fixed"></div>

            {/* Main Content Container - Using Flex to distribute space */}
            <div className="flex-grow flex flex-col items-center justify-evenly w-full max-w-5xl animate-fadeInUp relative z-10 px-4 py-6 md:py-0 h-full">

                {/* 1. LOGO AREA */}
                <div className="flex-shrink-0 mt-4 md:mt-0">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden group mx-auto">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity z-20"></div>
                        <img
                            src="/Gallery/logo.jpg"
                            alt="Flawless By Drashti"
                            className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                </div>

                {/* 2. HEADLINE */}
                <div className="space-y-3 md:space-y-6 flex-shrink-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-stone-300 font-bold">Coming Soon</span>
                    </div>
                    {/* Responsive Text Sizing: Starts small, grows on md/lg, but capped to avoid overflowing */}
                    <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tighter text-white leading-tight">
                        Something <span className="font-serif italic text-stone-400">Exquisite</span> <br />
                        Is Arriving.
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-stone-500 max-w-xl mx-auto font-light leading-relaxed px-4">
                        Curating a digital sanctuary for your beauty needs. <br className="hidden md:block" />
                        Be the first to experience Flawless By Drashti.
                    </p>
                </div>

                {/* 3. COUNTDOWN TIMER */}
                <div className="grid grid-cols-4 gap-2 md:gap-8 w-full max-w-2xl mx-auto flex-shrink-0">
                    <TimeBox value={timeLeft.days} label="Days" />
                    <TimeBox value={timeLeft.hours} label="Hrs" />
                    <TimeBox value={timeLeft.minutes} label="Mins" />
                    <TimeBox value={timeLeft.seconds} label="Secs" />
                </div>

                {/* 4. NOTIFY FORM */}
                <div className="w-full max-w-md mx-auto relative px-2 flex-shrink-0">
                    {status === 'success' ? (
                        <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-center gap-3 text-emerald-400 animate-fadeIn">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">You're on the list!</span>
                        </div>
                    ) : (
                        <form onSubmit={handleNotifyMe} className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-stone-500/20 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative flex shadow-2xl">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-stone-500" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-28 py-3 md:py-4 bg-stone-900 border border-white/10 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all text-xs md:text-sm tracking-wide"
                                    placeholder="Enter your email..."
                                />
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="absolute right-1 top-1 bottom-1 bg-white text-black hover:bg-stone-200 px-4 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Notify Me'}
                                </button>
                            </div>
                        </form>
                    )}
                    <p className="mt-3 text-[9px] text-stone-600 uppercase tracking-widest">
                        Wednesday, Feb 4th • 11:00 AM
                    </p>
                </div>

                {/* 5. Footer */}
                <div className="text-center flex-shrink-0 pb-4 md:pb-0">
                    <p className="text-[9px] text-stone-700 uppercase tracking-[0.2em]">Flawless by Drashti • Est. 2026</p>
                </div>

            </div>
        </div>
    );
};

const TimeBox = ({ value, label }) => (
    <div className="flex flex-col items-center p-2 md:p-6 bg-stone-900/50 backdrop-blur-md border border-white/5 rounded-xl md:rounded-2xl relative overflow-hidden group">
        <span className="text-2xl sm:text-3xl md:text-6xl font-sans font-light tabular-nums text-white">
            {String(value).padStart(2, '0')}
        </span>
        <span className="text-[7px] md:text-[9px] text-stone-500 uppercase tracking-[0.3em] font-bold mt-1 md:mt-2">
            {label}
        </span>
    </div>
);

export default LaunchCountdown;