import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [userName, setUserName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Load Remembered Email on Mount
  useState(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setCredentials(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 0. Handle Remember Me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', credentials.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // 1. Attempt Login
      const response = await login(credentials);

      // 2. Success! Show animation
      setUserName(response.user.name);
      setShowSuccessAnimation(true);

      // 3. Redirect to Home Page (No dashboard logic here)
      setTimeout(() => {
        navigate('/');
      }, 2000); // Reduced delay slightly for better UX

    } catch (error) {
      setError(error.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-white selection:bg-white selection:text-black">

      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-stone-800 rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-stone-900 rounded-full mix-blend-screen filter blur-[120px] opacity-30"></div>
      </div>

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950 backdrop-blur-md transition-all duration-500">
          <div className="text-center animate-fadeInUp">
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-ping"></div>
              <div className="absolute inset-2 border-2 border-white rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>

            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-4">
              Welcome Back, <span className="font-semibold text-stone-300">{userName}</span>
            </h2>
            <p className="text-stone-500 uppercase tracking-widest text-xs">Access Granted</p>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="relative max-w-md w-full animate-fadeInUp z-10">

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="mt-6 text-3xl font-light text-white">
            Sign In
          </h2>
          <p className="mt-2 text-stone-500 text-xs uppercase tracking-widest">
            Access your personalized beauty journey
          </p>
        </div>

        <div className="bg-stone-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl">
          {error && (
            <div className="mb-8 bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm font-light">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-500 w-5 h-5 group-focus-within:text-white transition-colors" />
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white placeholder-stone-600 transition-all text-sm tracking-wide"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-500 w-5 h-5 group-focus-within:text-white transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white placeholder-stone-600 transition-all text-sm tracking-wide"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-stone-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-600 bg-stone-800 text-white focus:ring-offset-stone-900"
                />
                <span className="ml-2 text-xs text-stone-400 uppercase tracking-wide">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-xs font-bold text-stone-400 hover:text-white uppercase tracking-wide transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-xl hover:bg-stone-200 transition-all duration-300 font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-stone-500 text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-white font-bold hover:text-stone-300 transition-colors ml-1 uppercase text-xs tracking-widest">
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-stone-500 hover:text-white transition-colors text-xs uppercase tracking-widest border-b border-transparent hover:border-white pb-1">
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;