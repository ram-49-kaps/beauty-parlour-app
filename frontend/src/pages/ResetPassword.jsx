import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Loader2, CheckCircle, XCircle } from 'lucide-react'; // Added icons for toast
import toast, { Toaster } from 'react-hot-toast';

import { API_BASE_URL } from '../config'; // Import Config

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // ✅ Use Global Config URL
      await axios.post(`${API_BASE_URL}/auth/reset-password/${token}`, { newPassword });

      // ✨ CUSTOM DARK THEME SUCCESS TOAST
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-stone-900 shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-white/10`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-white uppercase tracking-widest">
                  Success
                </p>
                <p className="mt-1 text-xs text-stone-400">
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

      // ❌ CUSTOM DARK THEME ERROR TOAST
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-stone-900 shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-red-500/50`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-white uppercase tracking-widest">
                  Error
                </p>
                <p className="mt-1 text-xs text-stone-400">
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
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 relative">
      <Toaster position="top-center" />

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_50%)]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* ✅ LOGO SECTION (Matches ForgotPassword style) */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-stone-900 rounded-full border border-white/10 flex items-center justify-center shadow-2xl p-1">
            <img
              src="/Gallery/logo.jpg"
              alt="Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        </div>

        {/* CARD */}
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/10 p-8 md:p-10 rounded-3xl shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-xl font-light text-white mb-2 uppercase tracking-[0.2em]">New Password</h2>
            <p className="text-stone-500 text-xs leading-relaxed">
              Please create a secure password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Set New Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 w-4 h-4 group-focus-within:text-white transition-colors" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-950 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-all placeholder:text-stone-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
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