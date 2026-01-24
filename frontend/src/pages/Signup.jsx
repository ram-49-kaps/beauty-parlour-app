import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Mail, Lock, User, AlertCircle, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

const Signup = () => {
  const navigate = useNavigate();
  const { register, setUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  // 1. New state to hold the name for the success screen
  const [successName, setSuccessName] = useState('');

  // --- Google Login Logic ---
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/google`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: tokenResponse.access_token,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Google signup failed');
        }

        // Save data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        
        // 2. Set the name from Google data
        setSuccessName(data.user.name);
        
        setShowSuccessAnimation(true);

        setTimeout(() => {
          if (data.user.role === 'admin') {
            navigate('/dashboard'); 
          } else {
            navigate('/');
          }
        }, 3000);

      } catch (err) {
        console.error('❌ Google signup failed:', err);
        setError('Google signup failed. Please try again.');
      }
    },
    onError: () => setError('Google signup failed'),
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      // 3. Set the name from form data
      setSuccessName(formData.name);
      
      setShowSuccessAnimation(true);
      
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-white selection:bg-white selection:text-black">
      
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-stone-800 rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-stone-900 rounded-full mix-blend-screen filter blur-[120px] opacity-30"></div>
      </div>

      {/* Luxury Success Animation */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/95 backdrop-blur-md transition-all duration-500">
          <div className="text-center animate-fadeInUp">
            <div className="relative w-64 h-64 mx-auto mb-8">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full animate-pulse shadow-[0_0_40px_rgba(255,255,255,0.3)]"></div>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-24 h-24 origin-bottom"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-60px)`,
                    animation: `petalBloom 0.8s ease-out ${i * 0.1}s forwards`
                  }}
                >
                  <div 
                    className="w-full h-full rounded-full border border-white/20"
                    style={{
                      background: `linear-gradient(135deg, rgba(255,255,255,0.1), transparent)`
                    }}
                  ></div>
                </div>
              ))}
            </div>
            <div>
              {/* 4. Display the correct successName */}
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-4">
                Welcome, <span className="font-semibold text-stone-300">{successName}</span>
              </h2>
              <p className="text-stone-500 uppercase tracking-widest text-xs mb-8">Registration Complete</p>
              <div className="inline-flex items-center gap-2 border border-white/20 text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest">
                <CheckCircle className="w-4 h-4" />
                Account Verified
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes petalBloom {
          0% { transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(0) scale(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(-60px) scale(1); opacity: 1; }
        }
        .animate-fadeInUp { animation: fadeInUp 1s ease-out 0.8s both; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Main Container */}
      <div className="relative max-w-md w-full animate-fadeInUp z-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          
          <h2 className="mt-6 text-3xl font-light text-white">
            Join The Circle
          </h2>
          <p className="mt-2 text-stone-500 text-xs uppercase tracking-widest">
            Begin your personalized beauty journey
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl">
          {error && (
            <div className="mb-8 bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 animate-fadeInUp">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm font-light">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">
                Full Name
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-500 w-5 h-5 group-focus-within:text-white transition-colors" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white placeholder-stone-600 transition-all text-sm tracking-wide"
                  placeholder="ENTER YOUR NAME"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-500 w-5 h-5 group-focus-within:text-white transition-colors" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white placeholder-stone-600 transition-all text-sm tracking-wide"
                  placeholder="NAME@EXAMPLE.COM"
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-500 w-5 h-5 group-focus-within:text-white transition-colors" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white placeholder-stone-600 transition-all text-sm tracking-wide"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-stone-500 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2">
               <input 
                 type="checkbox" 
                 id="terms" 
                 required 
                 className="mt-1 w-4 h-4 rounded border-stone-600 bg-stone-800 text-white focus:ring-offset-stone-900 accent-white" 
               />
              <label htmlFor="terms" className="text-xs text-stone-500 leading-relaxed">
                I agree to the{' '}
                <a href="/terms" className="text-white hover:text-stone-300 border-b border-white/20 hover:border-white transition-colors">
                  Terms & Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-white hover:text-stone-300 border-b border-white/20 hover:border-white transition-colors">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-xl hover:bg-stone-200 transition-all duration-300 font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="px-2 bg-stone-900 text-stone-500">Or sign up with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => googleLogin()}
              className="w-full flex items-center justify-center gap-3 bg-stone-950 border border-white/10 rounded-xl py-4 font-bold text-xs uppercase tracking-widest text-stone-300 hover:bg-stone-800 hover:text-white transition-all"
            >
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google"
                className="w-4 h-4 opacity-80"
              />
              Google
            </button>

          </form>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs font-bold text-stone-400 text-center uppercase tracking-widest mb-4">Membership Benefits</p>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
                <CheckCircle className="w-3 h-3 text-white" />
                <span>Priority Booking Access</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
                <CheckCircle className="w-3 h-3 text-white" />
                <span>Exclusive Seasonal Offers</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-stone-500 text-sm">
              Already a member?{' '}
              <Link to="/login" className="text-white font-bold hover:text-stone-300 transition-colors ml-1 uppercase text-xs tracking-widest">
                Sign In
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

export default Signup;