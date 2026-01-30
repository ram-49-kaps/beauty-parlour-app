
import React, { useState, useEffect } from 'react';
import { Mail, Loader2, Sparkles, CheckCircle } from 'lucide-react';

// Use standard HTML form submission if no backend endpoint exists immediately, 
// OR we can create a temporary endpoint. For now, we'll mock the submission or use a simple alert
// until the backend route is connected, but the user requested storage.
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
            setStatus('error'); // Or just show success to not discourage user if it's a temp fail
        }
    };

    // If LIVE, don't show the curtain! Return null so the main app renders.
    if (isLive) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-stone-950 flex flex-col items-center justify-center p-6 text-center">

            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-800/20 via-stone-950 to-stone-950"></div>

            <div className="relative z-10 max-w-4xl w-full animate-fadeInUp">

                {/* LOGO AREA */}
                <div className="mb-12 flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-stone-900 border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="text-4xl font-light text-white font-serif italic">F</span>
                    </div>
                </div>

                {/* HEADLINE */}
                <div className="mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
                        <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span className="text-[10px] uppercase tracking-[0.3em] text-stone-300 font-bold">Coming Soon</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tighter text-white leading-tight">
                        Something <span className="font-serif italic text-stone-400">Exquisite</span> <br />
                        Is Arriving.
                    </h1>
                    <p className="text-lg text-stone-500 max-w-2xl mx-auto font-light leading-relaxed">
                        We are curating a digital sanctuary for your beauty needs. <br className="hidden md:block" />
                        Be the first to experience Flawless By Drashti.
                    </p>
                </div>

                {/* COUNTDOWN TIMER */}
                <div className="grid grid-cols-4 gap-4 md:gap-12 max-w-3xl mx-auto mb-20">
                    <TimeBox value={timeLeft.days} label="Days" />
                    <TimeBox value={timeLeft.hours} label="Hours" />
                    <TimeBox value={timeLeft.minutes} label="Minutes" />
                    <TimeBox value={timeLeft.seconds} label="Seconds" />
                </div>

                {/* NOTIFY FORM */}
                <div className="max-w-md mx-auto relative">
                    {status === 'success' ? (
                        <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-center gap-3 text-emerald-400 animate-fadeIn">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-widest">You're on the list!</span>
                        </div>
                    ) : (
                        <form onSubmit={handleNotifyMe} className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-stone-500/20 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative flex shadow-2xl">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-stone-500" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-12 pr-32 py-5 bg-stone-900 border border-white/10 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all text-sm tracking-wide"
                                    placeholder="Enter your email address..."
                                />
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="absolute right-2 top-2 bottom-2 bg-white text-black hover:bg-stone-200 px-6 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Notify Me'}
                                </button>
                            </div>
                        </form>
                    )}
                    <p className="mt-4 text-[10px] text-stone-600 uppercase tracking-widest">
                        Wednesday, Feb 4th • 11:00 AM
                    </p>
                </div>

            </div>

            {/* Footer */}
            <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-[10px] text-stone-700 uppercase tracking-[0.2em]">Flawless by Drashti • Est. 2026</p>
            </div>

        </div>
    );
};

const TimeBox = ({ value, label }) => (
    <div className="flex flex-col items-center p-4 md:p-8 bg-stone-900/50 backdrop-blur-md border border-white/5 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">
        <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span className="text-4xl md:text-7xl font-sans font-light tabular-nums text-white group-hover:scale-110 transition-transform duration-500">
            {String(value).padStart(2, '0')}
        </span>
        <span className="text-[8px] md:text-[10px] text-stone-500 uppercase tracking-[0.3em] font-bold mt-2 md:mt-4">
            {label}
        </span>
    </div>
);

export default LaunchCountdown;
