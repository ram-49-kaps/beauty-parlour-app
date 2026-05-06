import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle, XCircle, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

import { API_BASE_URL } from '../config';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full shadow-2xl rounded-xl pointer-events-auto flex ring-1 ${
          isDark ? 'bg-stone-900 ring-white/10' : 'bg-white ring-gray-200'
        }`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Email Sent
                </p>
                <p className={`mt-1 text-xs ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                  Check your inbox for the reset link.
                </p>
              </div>
            </div>
          </div>
          <div className={`flex border-l ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <button
              onClick={() => toast.dismiss(t.id)}
              className={`w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium focus:outline-none ${
                isDark ? 'text-stone-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      ));

    } catch (error) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full shadow-2xl rounded-xl pointer-events-auto flex ring-1 ${
          isDark ? 'bg-stone-900 ring-red-500/20' : 'bg-white ring-red-200'
        }`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Error
                </p>
                <p className={`mt-1 text-xs ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                  {error.response?.data?.message || 'Something went wrong.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-stone-950 text-white' : 'bg-gray-50 text-gray-900'} flex flex-col items-center justify-center p-6 relative transition-colors duration-300`}>

      <Toaster position="top-center" />

      {/* Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-0 w-[420px] h-[420px] rounded-full blur-[120px] opacity-30 ${isDark ? 'bg-white/5' : 'bg-rose-100'}`}></div>
        <div className={`absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-[120px] opacity-30 ${isDark ? 'bg-white/5' : 'bg-indigo-100'}`}></div>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className={`absolute top-6 right-6 z-10 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] transition-all ${
          isDark
            ? 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {isDark ? 'Light' : 'Dark'}
      </button>

      <div className="w-full max-w-md relative z-10">

        {/* LOGO SECTION */}
        <div className="flex justify-center mb-8">
          <Link to="/" className={`w-20 h-20 rounded-full border flex items-center justify-center shadow-xl hover:scale-105 transition-transform p-1 ${
            isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-gray-200'
          }`}>
            <img
              src="/Gallery/logo.jpg"
              alt="Flawless Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </Link>
        </div>

        {/* CARD */}
        <div className={`backdrop-blur-md border p-8 md:p-10 rounded-3xl shadow-xl transition-colors duration-300 ${
          isDark ? 'bg-stone-900/90 border-white/10' : 'bg-white border-gray-200'
        }`}>
          <div className="text-center mb-10">
            <h2 className={`text-xl font-light mb-3 uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-gray-900'}`}>Recovery</h2>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
              Enter your registered email to receive a secure password reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Email Address</label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  isDark ? 'text-stone-500 group-focus-within:text-white' : 'text-gray-400 group-focus-within:text-gray-900'
                }`} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`w-full rounded-xl py-4 pl-12 pr-4 text-sm outline-none transition-all ${
                    isDark
                      ? 'bg-stone-950 border border-white/10 text-white focus:border-white/30 placeholder:text-stone-600'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-gray-400 placeholder:text-gray-400'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group ${
                isDark ? 'bg-white text-black hover:bg-stone-200' : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {loading ? (
                <>Sending <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : (
                <>Send Link <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className={`mt-8 text-center pt-8 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <Link to="/login" className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              isDark ? 'text-stone-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}>
              <ArrowLeft className="w-3 h-3" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
