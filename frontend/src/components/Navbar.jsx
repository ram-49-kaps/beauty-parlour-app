import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, X, User, CheckCircle, ChevronRight, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showLogoutAnimation, setShowLogoutAnimation] = useState(false);

  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHomePage = location.pathname === '/';
  const isActive = (path) => location.pathname === path;

  const handleLogoutClick = () => { setIsOpen(false); setShowLogoutDialog(true); };

  const confirmLogout = () => {
    setShowLogoutDialog(false);
    setShowLogoutAnimation(true);
    setTimeout(() => { logout(); setShowLogoutAnimation(false); navigate('/'); }, 3000);
  };

  // On homepage: transparent over hero (always white text), then solid on scroll.
  // On other pages: always solid.
  const useHeroStyle = isHomePage && !scrolled && !isOpen;

  const navBg = useHeroStyle
    ? 'bg-transparent py-6'
    : isDark
      ? 'bg-stone-950/95 backdrop-blur-md border-b border-white/10 shadow-sm py-3'
      : 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm py-3';

  // Text always white on hero overlay, otherwise theme-dependent
  const textColor = useHeroStyle ? 'text-white' : isDark ? 'text-white' : 'text-gray-900';
  const textMuted = useHeroStyle ? 'text-white/60' : isDark ? 'text-stone-400' : 'text-gray-500';
  const borderColor = useHeroStyle ? 'border-white/20' : isDark ? 'border-white/10' : 'border-gray-200';

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-500 ${navBg}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* LOGO */}
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/Gallery/logo.jpg" alt="Flawless Logo"
                className={`h-10 w-auto object-contain rounded-full border ${borderColor} group-hover:scale-105 transition-transform duration-300`} />
              <div className="flex flex-col justify-center">
                <span className={`text-xl md:text-2xl font-bold tracking-[0.15em] ${textColor} uppercase font-sans leading-none`}>Flawless</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`h-[1px] w-3 ${useHeroStyle ? 'bg-white/50' : isDark ? 'bg-stone-600' : 'bg-gray-400'} hidden md:block`}></span>
                  <span className={`text-[9px] md:text-[10px] tracking-[0.2em] ${textMuted} uppercase block`}>By Drashti</span>
                </div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-12">
              <Link to="/" className={`text-xs font-bold uppercase tracking-widest transition-all ${isActive('/') ? textColor : textMuted} hover:${textColor}`}>Home</Link>
              <Link to="/services" className={`text-xs font-bold uppercase tracking-widest transition-all ${isActive('/services') ? textColor : textMuted} hover:${textColor}`}>Services</Link>

              {user?.role === 'admin' && (
                <Link to="/admin-dashboard" className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${isActive('/admin-dashboard') ? textColor : textMuted}`}>
                  <LayoutDashboard className="w-3 h-3" /> Dashboard
                </Link>
              )}

              {/* 🌗 THEME TOGGLE */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-all duration-300 border ${
                  useHeroStyle
                    ? 'border-white/20 text-white/80 hover:text-white hover:bg-white/10'
                    : isDark
                      ? 'border-white/10 text-stone-400 hover:text-white hover:bg-white/10'
                      : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {user ? (
                <div className={`flex items-center gap-6 pl-6 border-l ${borderColor}`}>
                  {user.role !== 'admin' && (
                    <>
                      <Link to="/booking" className={`${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-lg`}>
                        Book Now
                      </Link>
                      <Link to="/profile" className={`flex items-center gap-3 ${textMuted} hover:${textColor} transition-colors group`}>
                        <div className={`p-1 rounded-full border ${borderColor} transition-colors`}><User className="w-3 h-3" /></div>
                        <span className="text-xs font-bold uppercase tracking-wider">{user.name}</span>
                      </Link>
                    </>
                  )}
                  <button onClick={handleLogoutClick} className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${textMuted} hover:text-red-500 transition-colors`}>
                    <LogOut className="w-3 h-3" /> Exit
                  </button>
                </div>
              ) : (
                <Link to="/login" className={`text-xs font-bold uppercase tracking-widest ${textColor} hover:opacity-70 transition-colors`}>Login</Link>
              )}
            </div>

            {/* Mobile: Theme + Menu */}
            <div className="md:hidden flex items-center gap-2">
              <button onClick={toggleTheme} className={`p-2 rounded-full border ${borderColor} ${textMuted}`}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsOpen(!isOpen)} className={`${textColor} hover:opacity-70 transition-colors`}>
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {isOpen && (
          <div className={`md:hidden ${isDark ? 'bg-stone-950 border-t border-white/10' : 'bg-white border-t border-gray-200'} animate-fadeInUp`}>
            <div className="px-6 py-8 space-y-6">
              <Link to="/" className={`block text-sm font-bold uppercase tracking-widest ${isActive('/') ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-stone-400' : 'text-gray-500')}`} onClick={() => setIsOpen(false)}>Home</Link>
              <Link to="/services" className={`block text-sm font-bold uppercase tracking-widest ${isActive('/services') ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-stone-400' : 'text-gray-500')}`} onClick={() => setIsOpen(false)}>Services</Link>

              {user ? (
                <div className={`pt-6 border-t ${isDark ? 'border-white/10' : 'border-gray-200'} space-y-6`}>
                  {user.role === 'admin' ? (
                    <Link to="/admin-dashboard" className={`block text-center w-full py-3 ${isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'} text-xs font-bold uppercase tracking-widest rounded-lg`} onClick={() => setIsOpen(false)}>Admin Dashboard</Link>
                  ) : (
                    <>
                      <Link to="/booking" className={`block text-center w-full py-3 ${isDark ? 'bg-white text-black' : 'bg-black text-white'} text-xs font-bold uppercase tracking-widest rounded-lg`} onClick={() => setIsOpen(false)}>Book Now</Link>
                      <Link to="/profile" className={`flex items-center justify-between group ${isDark ? 'bg-stone-900 border-white/10' : 'bg-gray-50 border-gray-200'} p-4 rounded-xl border`} onClick={() => setIsOpen(false)}>
                        <div className={`flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          <div className={`p-2 rounded-full border ${isDark ? 'bg-stone-800 border-white/10' : 'bg-gray-200 border-gray-300'}`}><User className="w-4 h-4" /></div>
                          <div>
                            <span className="block text-sm font-bold tracking-widest">{user.name}</span>
                            <span className={`block text-[10px] uppercase tracking-widest ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>View Profile</span>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${isDark ? 'text-stone-500' : 'text-gray-400'}`} />
                      </Link>
                    </>
                  )}
                  <button onClick={handleLogoutClick} className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest text-xs px-4"><LogOut className="w-4 h-4" /> Log Out</button>
                </div>
              ) : (
                <div className={`pt-6 border-t ${isDark ? 'border-white/10' : 'border-gray-200'} flex flex-col gap-4`}>
                  <Link to="/login" className={`block text-center w-full py-3 border ${isDark ? 'border-white/20 text-white' : 'border-gray-300 text-gray-900'} text-xs font-bold uppercase tracking-widest rounded-lg`} onClick={() => setIsOpen(false)}>Login</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Logout Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className={`${isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-gray-200'} border p-8 max-w-sm w-full mx-6 shadow-2xl animate-fadeInUp rounded-2xl`}>
            <div className="text-center">
              <div className={`w-16 h-16 border rounded-full flex items-center justify-center mx-auto mb-6 ${isDark ? 'border-white/10 bg-stone-800' : 'border-gray-200 bg-gray-50'}`}>
                <LogOut className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-700'}`} />
              </div>
              <h3 className={`text-xl font-light tracking-widest uppercase mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Sign Out?</h3>
              <p className={`text-sm mb-8 font-light ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>Are you sure you want to exit your session?</p>
              <div className="flex gap-4">
                <button onClick={() => setShowLogoutDialog(false)} className={`flex-1 px-6 py-3 border text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${isDark ? 'border-white/10 text-stone-300 hover:bg-stone-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
                <button onClick={confirmLogout} className={`flex-1 px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>Yes, Exit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Animation */}
      {showLogoutAnimation && (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center ${isDark ? 'bg-stone-950 text-white' : 'bg-white text-gray-900'}`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute top-20 left-10 w-96 h-96 rounded-full filter blur-[100px] opacity-30 animate-float ${isDark ? 'bg-white/5' : 'bg-rose-100'}`}></div>
            <div className={`absolute bottom-40 right-10 w-96 h-96 rounded-full filter blur-[100px] opacity-30 animate-float ${isDark ? 'bg-white/5' : 'bg-purple-100'}`} style={{ animationDelay: '2s' }}></div>
          </div>
          <div className="text-center relative z-10">
            <div className="animate-fadeInUp space-y-4">
              <h2 className={`text-4xl md:text-5xl font-light tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                See you soon, <span className={`font-semibold ${isDark ? 'text-stone-400' : 'text-gray-600'}`}>{user?.name}</span>
              </h2>
              <p className={`uppercase tracking-widest text-xs ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Session Ended Successfully</p>
              <div className={`mt-6 inline-flex items-center gap-2 border px-8 py-3 rounded-full ${isDark ? 'border-white/20 text-white' : 'border-gray-300 text-gray-900'}`}>
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Logged Out</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-fadeInUp { animation: fadeInUp 1s ease-out 0.8s both; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}</style>
    </>
  );
};

export default Navbar;