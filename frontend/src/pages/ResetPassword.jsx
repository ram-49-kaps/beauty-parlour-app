import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Loader2, CheckCircle, XCircle, Moon, Sun } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import { API_BASE_URL } from '../config';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password/${token}`, { newPassword });

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
                  Success
                </p>
                <p className={`mt-1 text-xs ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                  Your password has been updated. Redirecting...
                </p>
              </div>
            </div>
          </div>
        </div>
      ));

      setTimeout(() => navigate('/login'), 2000);

    } catch (error) {
      console.error(error);

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
                  {error.response?.data?.message || 'Link expired or invalid'}
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

      {/* Background Elements */}
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
          <div className={`w-20 h-20 rounded-full border flex items-center justify-center shadow-xl p-1 ${
            isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-gray-200'
          }`}>
            <img
              src="/Gallery/logo.jpg"
              alt="Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        </div>

        {/* CARD */}
        <div className={`backdrop-blur-md border p-8 md:p-10 rounded-3xl shadow-xl transition-colors duration-300 ${
          isDark ? 'bg-stone-900/90 border-white/10' : 'bg-white border-gray-200'
        }`}>
          <div className="text-center mb-8">
            <h2 className={`text-xl font-light mb-2 uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-gray-900'}`}>New Password</h2>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
              Please create a secure password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Set New Password</label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  isDark ? 'text-stone-500 group-focus-within:text-white' : 'text-gray-400 group-focus-within:text-gray-900'
                }`} />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
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
              className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                isDark ? 'bg-white text-black hover:bg-stone-200' : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {loading ? (
                <>Updating <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
