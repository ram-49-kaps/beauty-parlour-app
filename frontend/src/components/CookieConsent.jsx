// src/components/CookieConsent.jsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { X } from 'lucide-react';

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
            <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-xl border border-gray-200 p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                {/* Text Content */}
                <div className="flex-1 space-y-2">
                    <h3 className="text-gray-900 font-bold text-lg tracking-wide flex items-center gap-2">
                        We Value Your Privacy
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
                        We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts.
                        By clicking "Accept", you agree to the storing of cookies on your device.
                        <a href="/privacy" className="text-gray-900 hover:underline ml-1 font-medium">Read our Privacy Policy</a>.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                        onClick={handleDecline}
                        className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all text-xs font-bold uppercase tracking-widest w-full sm:w-auto"
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-8 py-3 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-all text-xs font-bold uppercase tracking-widest shadow-lg w-full sm:w-auto"
                    >
                        Accept
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CookieConsent;
