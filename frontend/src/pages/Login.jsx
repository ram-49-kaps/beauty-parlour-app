import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useGoogleLogin } from '@react-oauth/google';

const Login = () => {
  const navigate = useNavigate();
  const { login, setUser } = useAuth();
  const { isDark } = useTheme();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successName, setSuccessName] = useState('');

  const validateField = (name, value) => {
    const errors = { ...fieldErrors };
    if (name === 'email') {
      if (!value) errors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.email = 'Enter a valid email address';
      else errors.email = '';
    } else if (name === 'password') {
      if (!value) errors.password = 'Password is required';
      else if (value.length < 6) errors.password = 'Password must be at least 6 characters';
      else errors.password = '';
    }
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    const newErrors = validateField(name, value);
    setFieldErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate all fields
    const emailErrors = validateField('email', formData.email);
    const passwordErrors = validateField('password', formData.password);
    setFieldErrors({ email: emailErrors.email, password: emailErrors.password });
    
    if (emailErrors.email || passwordErrors.password) {
      setError('Please fix the errors above and try again');
      return;
    }
    
    setLoading(true);
    try {
      const user = await login(formData);
      setSuccessName(user.name);
      setShowSuccessAnimation(true);
      setTimeout(() => { user.role === 'admin' ? navigate('/admin-dashboard') : navigate('/'); }, 3000);
    } catch (error) { setError(error.response?.data?.message || 'Invalid email or password'); }
    finally { setLoading(false); }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-gray-900 selection:text-white ${isDark ? 'bg-stone-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-0 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-30 ${isDark ? 'bg-white/5' : 'bg-rose-100'}`}></div>
        <div className={`absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-30 ${isDark ? 'bg-white/5' : 'bg-purple-100'}`}></div>
      </div>

      {/* Success Animation */}
      {showSuccessAnimation && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md transition-all duration-500 ${isDark ? 'bg-stone-950/95' : 'bg-white/95'}`}>
          <div className="text-center animate-fadeInUp">
            <h2 className={`text-4xl md:text-5xl font-light tracking-tight mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Welcome back, <span className={`font-semibold ${isDark ? 'text-stone-400' : 'text-gray-600'}`}>{successName}</span>
            </h2>
            <p className={`uppercase tracking-widest text-xs mb-8 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Authentication Successful</p>
            <div className={`inline-flex items-center gap-2 border px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest ${isDark ? 'border-white/20 text-white' : 'border-gray-300 text-gray-900'}`}>
              <CheckCircle className="w-4 h-4" /> Verified
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="relative max-w-md w-full z-10">
        <div className="text-center mb-10">
          <h2 className={`mt-6 text-3xl font-light ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome Back</h2>
          <p className={`mt-2 text-xs uppercase tracking-widest ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Sign in to your account</p>
        </div>

        <div className={`backdrop-blur-md border rounded-2xl p-8 md:p-10 shadow-xl ${isDark ? 'bg-stone-900/80 border-white/10' : 'bg-white border-gray-200'}`}>
          {error && (
            <div className={`mb-8 border rounded-lg p-4 flex items-start gap-3 ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-500 text-sm font-light">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Email Address</label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? 'text-stone-500 group-focus-within:text-white' : 'text-gray-400 group-focus-within:text-gray-900'}`} />
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className={`w-full pl-12 pr-4 py-4 rounded-xl focus:outline-none transition-all text-sm tracking-wide border ${fieldErrors.email ? (isDark ? 'border-red-500/50 bg-red-500/10' : 'border-red-300 bg-red-50') : (isDark ? 'bg-stone-950 border-white/10 focus:border-white/30 text-white placeholder-stone-600' : 'bg-gray-50 border-gray-200 focus:border-gray-400 text-gray-900 placeholder-gray-400')}`}
                  placeholder="NAME@EXAMPLE.COM" required />
              </div>
              {fieldErrors.email && <p className="text-red-500 text-xs font-light mt-1 ml-1">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Password</label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? 'text-stone-500 group-focus-within:text-white' : 'text-gray-400 group-focus-within:text-gray-900'}`} />
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange}
                  className={`w-full pl-12 pr-12 py-4 rounded-xl focus:outline-none transition-all text-sm tracking-wide border ${fieldErrors.password ? (isDark ? 'border-red-500/50 bg-red-500/10' : 'border-red-300 bg-red-50') : (isDark ? 'bg-stone-950 border-white/10 focus:border-white/30 text-white placeholder-stone-600' : 'bg-gray-50 border-gray-200 focus:border-gray-400 text-gray-900 placeholder-gray-400')}`}
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-stone-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-red-500 text-xs font-light mt-1 ml-1">{fieldErrors.password}</p>}
            </div>

            <div className="flex justify-between items-center">
              <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-stone-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-black bg-transparent" defaultChecked />
                <span className="text-xs font-bold uppercase tracking-widest">Remember Me</span>
              </label>
              <Link to="/forgot-password" className={`text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? 'text-stone-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>Forgot Password?</Link>
            </div>

            <button type="submit" disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
              {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div> Authenticating...</>) : (<>Sign In <ArrowRight className="w-4 h-4" /></>)}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}></div></div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className={`px-2 ${isDark ? 'bg-stone-900 text-stone-500' : 'bg-white text-gray-500'}`}>Or continue with</span></div>
            </div>

            <button type="button" onClick={() => googleLogin()}
              className={`w-full flex items-center justify-center gap-3 border rounded-xl py-4 font-bold text-xs uppercase tracking-widest transition-all ${isDark
                ? 'bg-stone-950 border-white/10 text-stone-400 hover:text-white hover:border-white/30'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="w-4 h-4" /> Google
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className={`text-sm ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>
              New to Flawless?{' '}
              <Link to="/signup" className={`font-bold uppercase text-xs tracking-widest ml-1 ${isDark ? 'text-white hover:text-stone-300' : 'text-gray-900 hover:text-gray-600'}`}>Create Account</Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className={`text-xs uppercase tracking-widest border-b border-transparent pb-1 transition-colors ${isDark ? 'text-stone-500 hover:text-white hover:border-white' : 'text-gray-500 hover:text-gray-900 hover:border-gray-900'}`}>Back to Homepage</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;