import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { X } from 'lucide-react';
import { googleLogin } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LoginModal = ({ isOpen, onClose }) => {
  const { setUser } = useAuth();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-stone-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 text-center relative z-0">
          {/* Logo/Icon */}
          <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-lg overflow-hidden">
             <img src="/Gallery/logo.jpg" alt="Flawless Logo" className="w-full h-full object-cover" />
          </div>

          <h2 className="text-2xl font-light text-white mb-2 tracking-wide">Welcome to Flawless</h2>
          <p className="text-stone-400 text-sm mb-8 leading-relaxed">
            Sign in to unlock exclusive offers, manage your bookings, and get personalized recommendations.
          </p>

          {/* Google Button */}
          <button
            onClick={() => handleGoogleLogin()}
            className="w-full bg-white text-black font-medium py-3.5 px-4 rounded-xl hover:bg-stone-200 transition-all flex items-center justify-center gap-3 mb-4 group shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
          >
            {/* Google Icon SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26-.19-.58z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-6">
            Secure Access via Google
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
