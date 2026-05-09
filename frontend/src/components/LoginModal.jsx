import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { X } from 'lucide-react';
import { googleLogin } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const LoginModal = ({ isOpen, onClose }) => {
  const { setUser } = useAuth();
  const { isDark } = useTheme();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await googleLogin(tokenResponse.access_token);
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          setUser(res.data.user);
          toast.success(`Welcome, ${res.data.user.name}!`);
          onClose();
        }
      } catch (error) {
        console.error('Google Login Error:', error);
        toast.error('Google Login Failed');
      }
    },
    onError: () => toast.error('Google Login Failed'),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`relative w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${
        isDark
          ? 'bg-stone-900 border-white/10'
          : 'bg-white border-gray-200'
      }`}>
        
        {/* Decorative Background */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none ${
          isDark ? 'bg-white/5' : 'bg-gray-100'
        }`}></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className={`absolute top-4 right-4 transition-colors p-1 rounded-full z-10 ${
            isDark
              ? 'text-stone-500 hover:text-white hover:bg-white/10'
              : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <X size={20} />
        </button>

        <div className="p-8 text-center relative z-0">
          {/* Logo/Icon */}
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border shadow-lg overflow-hidden ${
            isDark
              ? 'bg-stone-800 border-white/10'
              : 'bg-gray-50 border-gray-200'
          }`}>
             <img src="/Gallery/logo.jpg" alt="Flawless Logo" className="w-full h-full object-cover" />
          </div>

          <h2 className={`text-2xl font-light mb-2 tracking-wide ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Welcome to Flawless</h2>
          <p className={`text-sm mb-8 leading-relaxed ${
            isDark ? 'text-stone-400' : 'text-gray-500'
          }`}>
            Sign in to unlock exclusive offers, manage your bookings, and get personalized recommendations.
          </p>

          {/* Google Button */}
          <button
            onClick={() => handleGoogleLogin()}
            className={`w-full font-medium py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 mb-4 group shadow-lg ${
              isDark
                ? 'bg-white text-black hover:bg-stone-200'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {/* Google Icon SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill={isDark ? '#000' : '#fff'}
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill={isDark ? '#000' : '#fff'}
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill={isDark ? '#000' : '#fff'}
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26-.19-.58z"
              />
              <path
                fill={isDark ? '#000' : '#fff'}
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className={`text-[10px] uppercase tracking-widest mt-6 ${
            isDark ? 'text-stone-600' : 'text-gray-400'
          }`}>
            Secure Access via Google
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
