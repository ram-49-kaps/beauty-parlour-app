import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import { API_BASE_URL } from '../config';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password/${token}`, { newPassword });

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-gray-200`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                  Success
                </p>
                <p className="mt-1 text-xs text-gray-500">
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
    <div className={`min-h-screen ${isDark ? 'bg-stone-950' : 'bg-gray-50'} flex flex-col items-center justify-center p-6 relative`}>
      <Toaster position="top-center" />

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.02),transparent_50%)]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* LOGO SECTION */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-xl p-1">
            <img
              src="/Gallery/logo.jpg"
              alt="Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        </div>

        {/* CARD */}
        <div className="bg-white backdrop-blur-md border border-gray-200 p-8 md:p-10 rounded-3xl shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-xl font-light text-gray-900 mb-2 uppercase tracking-[0.2em]">New Password</h2>
            <p className="text-gray-500 text-xs leading-relaxed">
              Please create a secure password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Set New Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-gray-900 transition-colors" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 text-sm outline-none focus:border-gray-400 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
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