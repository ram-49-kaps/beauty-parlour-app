import React, { useState, useEffect } from 'react';
import { Mail, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import api from '../services/api';

const LaunchCountdown = () => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isLive, setIsLive] = useState(false);
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle');

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
        <div className="fixed inset-0 z-[99999] bg-stone-950 flex flex-col items-center justify-center min-h-screen text-center overflow-y-auto no-scrollbar">

            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-800/20 via-stone-950 to-stone-950 pointer-events-none"></div>

            {/* Main Content Centered */}
            <div className="flex-grow flex flex-col items-center justify-center w-full max-w-5xl animate-fadeInUp relative z-10 px-4 py-10 md:py-20">

                {/* LOGO AREA */}
                <div className="mb-8 md:mb-12">
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden group mx-auto">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity z-20"></div>
                        <img
                            src="/Gallery/logo.jpg"
                            alt="Flawless By Drashti"
                            className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                </div>

                {/* HEADLINE */}
                <div className="mb-10 md:mb-16 space-y-4 md:space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-2 md:mb-4">
                        <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span className="text-[10px] uppercase tracking-[0.3em] text-stone-300 font-bold">Coming Soon</span>
                    </div>
                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-light tracking-tighter text-white leading-tight">
                        Something <span className="font-serif italic text-stone-400">Exquisite</span> <br />
                        Is Arriving.
                    </h1>
                    <p className="text-sm md:text-lg text-stone-500 max-w-xl mx-auto font-light leading-relaxed px-4">
                        We are curating a digital sanctuary for your beauty needs. <br className="hidden md:block" />
                        Be the first to experience Flawless By Drashti.
                    </p>
                </div>

                {/* COUNTDOWN TIMER */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 w-full max-w-4xl mx-auto mb-12 md:mb-20 px-2 md:px-0">
                    <TimeBox value={timeLeft.days} label="Days" />
                    <TimeBox value={timeLeft.hours} label="Hours" />
                    <TimeBox value={timeLeft.minutes} label="Minutes" />
                    <TimeBox value={timeLeft.seconds} label="Seconds" />
                </div>

                {/* NOTIFY FORM */}
                <div className="w-full max-w-md mx-auto relative px-4">
                    {status === 'success' ? (
                        <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-center gap-3 text-emerald-400 animate-fadeIn">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-widest">You're on the list!</span>
                        </div>
                    ) : (
                        <form onSubmit={handleNotifyMe} className="relative group w-full">
                            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-stone-500/20 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

                            {/* Flex container for input and button */}
                            <div className="relative flex flex-col md:flex-row shadow-2xl gap-3 md:gap-0 w-full">
                                <div className="relative flex-grow w-full">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-stone-500" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-12 pr-4 py-4 bg-stone-900 border border-white/10 rounded-xl md:rounded-r-none text-white placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all text-sm tracking-wide"
                                        placeholder="Enter your email address..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full md:w-auto bg-white text-black hover:bg-stone-200 px-8 py-4 md:py-0 rounded-xl md:rounded-l-none text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Notify Me'}
                                </button>
                            </div>
                        </form>
                    )}
                    <p className="mt-8 text-[10px] text-stone-600 uppercase tracking-widest">
                        Wednesday, Feb 4th • 11:00 AM
                    </p>
                </div>

            </div>

            {/* Footer */}
            <div className="py-6 text-center z-10 w-full">
                <p className="text-[10px] text-stone-700 uppercase tracking-[0.2em]">Flawless by Drashti • Est. 2026</p>
            </div>

        </div>
    );
};

const TimeBox = ({ value, label }) => (
    <div className="flex flex-col items-center justify-center p-6 md:p-8 bg-stone-900/50 backdrop-blur-md border border-white/5 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500 w-full aspect-square md:aspect-auto">
        <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span className="text-4xl md:text-6xl lg:text-7xl font-sans font-light tabular-nums text-white group-hover:scale-110 transition-transform duration-500 leading-none">
            {String(value).padStart(2, '0')}
        </span>
        <span className="text-[8px] md:text-[10px] text-stone-500 uppercase tracking-[0.3em] font-bold mt-2 md:mt-4">
            {label}
        </span>
    </div>
);

export default LaunchCountdown;