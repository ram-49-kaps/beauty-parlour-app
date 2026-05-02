import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

import { API_BASE_URL } from '../config';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-gray-200`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                  Email Sent
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Check your inbox for the reset link.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-500 hover:text-gray-900 focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      ));

    } catch (error) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-red-200`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                  Error
                </p>
                <p className="mt-1 text-xs text-gray-500">
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
    <div className={`min-h-screen ${isDark ? 'bg-stone-950' : 'bg-gray-50'} flex flex-col items-center justify-center p-6 relative`}>

      <Toaster position="top-center" />

      {/* Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.02),transparent_50%)]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* LOGO SECTION */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="w-20 h-20 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-xl hover:scale-105 transition-transform p-1">
            <img
              src="/Gallery/logo.jpg"
              alt="Flawless Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </Link>
        </div>

        {/* CARD */}
        <div className="bg-white backdrop-blur-md border border-gray-200 p-8 md:p-10 rounded-3xl shadow-xl">
          <div className="text-center mb-10">
            <h2 className="text-xl font-light text-gray-900 mb-3 uppercase tracking-[0.2em]">Recovery</h2>
            <p className="text-gray-500 text-xs leading-relaxed">
              Enter your registered email to receive a secure password reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-gray-900 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 text-sm outline-none focus:border-gray-400 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>Sending <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : (
                <>Send Link <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-8 border-t border-gray-200">
            <Link to="/login" className="inline-flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;