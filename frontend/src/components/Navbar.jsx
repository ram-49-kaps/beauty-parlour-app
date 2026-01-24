import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, X, User, CheckCircle, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showLogoutAnimation, setShowLogoutAnimation] = useState(false);

  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleLogoutClick = () => {
    setIsOpen(false);
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    setShowLogoutDialog(false);
    setShowLogoutAnimation(true);

    setTimeout(() => {
      logout();
      setShowLogoutAnimation(false);
      navigate('/'); // Redirect to Home
    }, 3000);
  };

  return (
    <>
      <nav
        className={`fixed w-full z-50 transition-all duration-500 ${scrolled || isOpen
            ? 'bg-stone-950/90 backdrop-blur-md border-b border-white/10 shadow-lg py-3'
            : 'bg-transparent py-6'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* --- LOGO SECTION --- */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/Gallery/logo.jpg"
                alt="Flawless Logo"
                className="h-10 w-auto object-contain rounded-full border border-white/20 group-hover:scale-105 transition-transform duration-300"
              />

              <div className="flex flex-col justify-center">
                <span className="text-xl md:text-2xl font-bold tracking-[0.15em] text-white uppercase font-sans leading-none">
                  Flawless
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="h-[1px] w-3 bg-stone-500 hidden md:block"></span>
                  <span className="text-[9px] md:text-[10px] tracking-[0.2em] text-stone-400 uppercase block">
                    By Drashti
                  </span>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-12">
              <Link
                to="/"
                className={`text-xs font-bold uppercase tracking-widest transition-all hover:text-white ${isActive('/') ? 'text-white' : 'text-white/60'
                  }`}
              >
                Home
              </Link>

              <Link
                to="/services"
                className={`text-xs font-bold uppercase tracking-widest transition-all hover:text-white ${isActive('/services') ? 'text-white' : 'text-white/60'
                  }`}
              >
                Services
              </Link>

              {/* 🔒 ADMIN VIEW: Dashboard Only */}
              {user?.role === 'admin' && (
                <Link
                  to="/admin-dashboard"
                  className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all hover:text-white ${isActive('/admin-dashboard') ? 'text-white' : 'text-white/60'
                    }`}
                >
                  <LayoutDashboard className="w-3 h-3" />
                  Dashboard
                </Link>
              )}

              {user ? (
                <div className="flex items-center gap-6 pl-6 border-l border-white/10">

                  {/* 👤 CUSTOMER VIEW: Book Now & Profile (HIDDEN FOR ADMIN) */}
                  {user.role !== 'admin' && (
                    <>
                      <Link
                        to="/booking"
                        className="bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-stone-200 transition-all duration-300"
                      >
                        Book Now
                      </Link>

                      <Link
                        to="/profile"
                        className="flex items-center gap-3 text-white/80 hover:text-white transition-colors group"
                      >
                        <div className="p-1 rounded-full border border-white/20 group-hover:border-white transition-colors">
                          <User className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">{user.name}</span>
                      </Link>
                    </>
                  )}

                  {/* LOGOUT BUTTON (For Everyone) */}
                  <button
                    onClick={handleLogoutClick}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    Exit
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    to="/login"
                    className="text-xs font-bold uppercase tracking-widest text-white hover:text-stone-300 transition-colors"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-white hover:text-stone-300 transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isOpen && (
          <div className="md:hidden bg-stone-950 border-t border-white/10 animate-fadeInUp">
            <div className="px-6 py-8 space-y-6">
              <Link
                to="/"
                className={`block text-sm font-bold uppercase tracking-widest ${isActive('/') ? 'text-white' : 'text-stone-500'}`}
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/services"
                className={`block text-sm font-bold uppercase tracking-widest ${isActive('/services') ? 'text-white' : 'text-stone-500'}`}
                onClick={() => setIsOpen(false)}
              >
                Services
              </Link>

              {user ? (
                <div className="pt-6 border-t border-white/10 space-y-6">

                  {/* 🔒 ADMIN MOBILE VIEW */}
                  {user.role === 'admin' ? (
                    <Link
                      to="/admin-dashboard"
                      className="block text-center w-full py-3 bg-white text-black text-xs font-bold uppercase tracking-widest"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  ) : (
                    /* 👤 CUSTOMER MOBILE VIEW */
                    <>
                      <Link
                        to="/booking"
                        className="block text-center w-full py-3 bg-white text-black text-xs font-bold uppercase tracking-widest"
                        onClick={() => setIsOpen(false)}
                      >
                        Book Now
                      </Link>

                      <Link
                        to="/profile"
                        className="flex items-center justify-between group bg-white/5 p-4 rounded-xl border border-white/10"
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="flex items-center gap-3 text-white">
                          <div className="p-2 bg-stone-900 rounded-full border border-white/10">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block text-sm font-bold tracking-widest">{user.name}</span>
                            <span className="block text-[10px] text-stone-500 uppercase tracking-widest">View Profile</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-500" />
                      </Link>
                    </>
                  )}

                  <button
                    onClick={handleLogoutClick}
                    className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-widest text-xs px-4"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="pt-6 border-t border-white/10 flex flex-col gap-4">
                  <Link
                    to="/login"
                    className="block text-center w-full py-3 border border-white/20 text-white text-xs font-bold uppercase tracking-widest"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Logout Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-white/10 p-8 max-w-sm w-full mx-6 shadow-2xl animate-fadeInUp">
            <div className="text-center">
              <div className="w-16 h-16 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 bg-stone-800">
                <LogOut className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl text-white font-light tracking-widest uppercase mb-2">Sign Out?</h3>
              <p className="text-stone-400 text-sm mb-8 font-light">Are you sure you want to exit your session?</p>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowLogoutDialog(false)}
                  className="flex-1 px-6 py-3 border border-white/20 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-stone-200 transition-all"
                >
                  Yes, Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Success Animation */}
      {showLogoutAnimation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950 text-white">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-96 h-96 bg-stone-800 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float"></div>
            <div className="absolute bottom-40 right-10 w-96 h-96 bg-stone-700 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
          </div>

          <div className="text-center relative z-10">
            <div className="relative w-64 h-64 mx-auto mb-8">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full animate-pulse shadow-[0_0_50px_rgba(255,255,255,0.5)]"></div>
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
                      background: `linear-gradient(135deg, ${i % 2 === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}, transparent)`
                    }}
                  ></div>
                </div>
              ))}
            </div>
            <div className="animate-fadeInUp space-y-4">
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white">
                See you soon, <span className="font-semibold text-stone-300">{user?.name}</span>
              </h2>
              <p className="text-stone-500 uppercase tracking-widest text-xs">Session Ended Successfully</p>
              <div className="mt-6 inline-flex items-center gap-2 border border-white/20 text-white px-8 py-3 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Logged Out</span>
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
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}</style>
    </>
  );
};

export default Navbar;