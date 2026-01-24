import React, { useState } from 'react';
import axios from 'axios';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

import { API_BASE_URL } from '../config'; // Import Config

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use API_BASE_URL
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });

      // CUSTOM PREMIUM TOAST - SUCCESS
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-stone-900 shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-white/10`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-white uppercase tracking-widest">
                  Email Sent
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  Check your inbox for the reset link.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-white/10">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-stone-400 hover:text-white focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      ));

    } catch (error) {
      // CUSTOM PREMIUM TOAST - ERROR
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
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 relative">

      <Toaster position="top-center" />

      {/* Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_50%)]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* ✅ UPDATED LOGO SECTION */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="w-20 h-20 bg-stone-900 rounded-full border border-white/10 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform p-1">
            {/* Replaced 'F' text with Image */}
            <img
              src="/Gallery/logo.jpg"
              alt="Flawless Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </Link>
        </div>

        {/* CARD */}
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/10 p-8 md:p-10 rounded-3xl shadow-xl">
          <div className="text-center mb-10">
            <h2 className="text-xl font-light text-white mb-3 uppercase tracking-[0.2em]">Recovery</h2>
            <p className="text-stone-500 text-xs leading-relaxed">
              Enter your registered email to receive a secure password reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 w-4 h-4 group-focus-within:text-white transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-stone-950 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-all placeholder:text-stone-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-stone-200 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>Sending <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : (
                <>Send Link <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-8 border-t border-white/5">
            <Link to="/login" className="inline-flex items-center gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-widest hover:text-white transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;