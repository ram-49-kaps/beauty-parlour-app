import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, ShieldCheck, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast, { Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '../config';

const AdminLogin = () => {
  const { setUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/admin-login`, {
        email: email.trim(),
        password: password.trim()
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        toast.success("Logged in successfully");
        setTimeout(() => {
          navigate('/admin-dashboard');
        }, 500);
      }

    } catch (err) {
      console.error(err);
      setError('Access Denied: Invalid Credentials or Server Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-stone-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Toaster position="top-center" />
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

      <div className={`max-w-sm w-full relative overflow-hidden rounded-2xl border p-8 shadow-xl backdrop-blur-md transition-colors duration-300 ${
        isDark ? 'bg-stone-900/90 border-white/10' : 'bg-white border-gray-200'
      }`}>

        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}></div>

        <div className="text-center mb-8 relative z-10">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border shadow-lg ${
            isDark
              ? 'bg-gradient-to-br from-stone-700 to-stone-950 border-white/10'
              : 'bg-gradient-to-br from-gray-700 to-gray-900 border-gray-300'
          }`}>
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-2xl font-light tracking-wide uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>Owner Access</h1>
          <p className={`text-[10px] tracking-[0.2em] mt-2 uppercase ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Authorized Personnel Only</p>
        </div>

        {error && (
          <div className={`text-xs p-3 rounded-lg mb-6 text-center animate-pulse border ${
            isDark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Owner Email</label>
            <div className="relative group">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-stone-500 group-focus-within:text-white' : 'text-gray-400 group-focus-within:text-gray-900'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-lg py-3 pl-10 pr-4 focus:outline-none transition-colors text-sm ${
                  isDark
                    ? 'bg-stone-950 border border-white/10 text-white focus:border-white/30'
                    : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-gray-400'
                }`}
                placeholder="owner@flawless.com"
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Security Key</label>
            <div className="relative group">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-stone-500 group-focus-within:text-white' : 'text-gray-400 group-focus-within:text-gray-900'}`} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-lg py-3 pl-10 pr-4 focus:outline-none transition-colors text-sm ${
                  isDark
                    ? 'bg-stone-950 border border-white/10 text-white focus:border-white/30'
                    : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-gray-400'
                }`}
                placeholder="Enter key"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold text-xs uppercase tracking-widest py-4 rounded-lg transition-all disabled:opacity-50 shadow-lg ${
              isDark ? 'bg-white text-black hover:bg-stone-200' : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {loading ? 'Verifying Identity...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
