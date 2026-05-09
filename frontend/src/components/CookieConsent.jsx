// src/components/CookieConsent.jsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);
  const { isDark } = useTheme();

    useEffect(() => {
        const consent = localStorage.getItem('cookieConsent');
        if (!consent) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('cookieConsent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[10000] p-4 md:p-6 animate-[slideUp_0.5s_ease-out]">
            <div className={`max-w-4xl mx-auto backdrop-blur-xl border p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                isDark
                    ? 'bg-stone-900/95 border-white/10'
                    : 'bg-white/95 border-gray-200'
            }`}>

                {/* Text Content */}
                <div className="flex-1 space-y-2">
                    <h3 className={`font-bold text-lg tracking-wide flex items-center gap-2 ${
                        isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                        We Value Your Privacy
                    </h3>
                    <p className={`text-sm leading-relaxed max-w-2xl ${
                        isDark ? 'text-stone-400' : 'text-gray-500'
                    }`}>
                        We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts.
                        By clicking "Accept", you agree to the storing of cookies on your device.
                        <a href="/privacy" className={`hover:underline ml-1 font-medium ${
                            isDark ? 'text-white' : 'text-gray-900'
                        }`}>Read our Privacy Policy</a>.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                        onClick={handleDecline}
                        className={`px-6 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest w-full sm:w-auto ${
                            isDark
                                ? 'border-white/10 text-stone-400 hover:bg-white/5 hover:text-white'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleAccept}
                        className={`px-8 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-widest shadow-lg w-full sm:w-auto ${
                            isDark
                                ? 'bg-white text-black hover:bg-stone-200'
                                : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                    >
                        Accept
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CookieConsent;
