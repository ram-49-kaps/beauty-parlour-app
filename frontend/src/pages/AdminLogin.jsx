import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Import Axios
import { Lock, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '../config'; // Import Config

const AdminLogin = () => {
  const { setUser } = useAuth(); // ✅ Get setUser from context
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
      // 1. SEND CREDENTIALS TO BACKEND
      const response = await axios.post(`${API_BASE_URL}/admin-login`, {
        email: email.trim(),
        password: password.trim()
      });

      // 2. IF SUCCESS, SERVER RETURNS A REAL TOKEN
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // ✅ CRITICAL FIX: Update Context State so AdminRoute knows we are logged in!
        setUser(response.data.user);

        // ✅ Notification
        toast.success("Logged in successfully");

        // 3. REDIRECT TO DASHBOARD
        // The dashboard will now accept this token because the server signed it!
        // Small delay to let state update and toast show
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
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <Toaster position="top-center" />
      <div className="bg-stone-900 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full relative overflow-hidden">

        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-stone-700 to-black rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl text-white font-light tracking-wide uppercase">Owner Access</h1>
          <p className="text-stone-500 text-[10px] tracking-[0.2em] mt-2 uppercase">Authorized Personnel Only</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3 rounded-lg mb-6 text-center animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Owner Email</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 group-focus-within:text-white transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-950 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-white/40 transition-colors text-sm"
                placeholder="owner@flawless.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Security Key</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 group-focus-within:text-white transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-950 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-white/40 transition-colors text-sm"
                placeholder="Enter key"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:bg-stone-200 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
          >
            {loading ? 'Verifying Identity...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;