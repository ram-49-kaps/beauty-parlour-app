import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clock, ChevronDown, Lock, LogIn, UserPlus, X, Sparkles } from 'lucide-react';
import { getServices } from '../services/api';
import Gallery from '../components/Gallery';
import { useAuth } from "../context/AuthContext";

import { getImageUrl } from '../config'; // Import Config

const Homepage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 🔐 SECRET DOOR STATE
  const [tapCount, setTapCount] = useState(0);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
  }, []);

  // 🔐 SECRET DOOR LOGIC: Reset tap count if idle for 1 second
  useEffect(() => {
    const timer = setTimeout(() => setTapCount(0), 1000);
    return () => clearTimeout(timer);
  }, [tapCount]);

  const handleSecretTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    // 🚀 TRIGGER: 5 Taps unlocks the admin portal
    if (newCount === 5) {
      navigate('/secure-owner-portal-2026'); // Replace with your secret path or '/admin-login'
      setTapCount(0);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await getServices();
      const allServices = response.data;

      // Filter logic
      const mainServices = allServices.filter(service => {
        const name = service.name.toLowerCase();
        return !name.includes('lash') && !name.includes('lens');
      });

      setServices(mainServices.slice(0, 3));
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = () => {
    if (user) {
      navigate('/booking');
    } else {
      setShowLoginModal(true);
    }
  };

  // Helper now imported from config.js to support production URLs
  // const getImageUrl ... (Removed local function)

  const getServiceImage = (service) => {
    const path = service.image_url || service.image;
    if (!path) return 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800';
    return getImageUrl(path);
  };

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-white selection:bg-white selection:text-black">

      {/* --- HERO SECTION --- */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* ✅ PERFORMANCE: Responsive Image (Small for Mobile, Large for Desktop) */}
          <img
            srcSet="
              https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=600&auto=format&fit=crop 600w,
              https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1200&auto=format&fit=crop 1200w,
              https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=2070&auto=format&fit=crop 2000w
            "
            sizes="(max-width: 600px) 600px, (max-width: 1200px) 1200px, 2000px"
            src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=2070&auto=format&fit=crop"
            alt="Luxury Salon Interior"
            className="w-full h-full object-cover opacity-60"
            fetchPriority="high" // ⚡ Critical for LCP
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-stone-950"></div>
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 py-1 px-4 border border-white/20 rounded-full bg-black/30 backdrop-blur-md mb-8">
            <Sparkles className="w-3 h-3 text-stone-300" />
            <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-stone-300">
              Est. 2026 • Surat, India
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight leading-tight mb-8">
            Unveil Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-stone-200 to-stone-500">
              True Elegance
            </span>
          </h1>

          <p className="text-lg md:text-xl text-stone-300 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            A sanctuary where modern artistry meets timeless beauty.
            Experience premium care tailored exclusively for you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <button
              onClick={handleBookClick}
              className="w-full sm:w-auto px-10 py-4 bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-stone-200 transition-all duration-300 rounded-full"
            >
              {user ? 'Book Now' : 'Join Us'}
            </button>
            <a
              href="#services"
              className="w-full sm:w-auto px-10 py-4 border border-white/30 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition-all duration-300 backdrop-blur-sm rounded-full"
            >
              View Services
            </a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 animate-bounce">
          <ChevronDown className="w-6 h-6" />
        </div>
      </section>

      {/* --- SERVICES SECTION --- */}
      <section id="services" className="py-32 bg-stone-950 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col items-center text-center md:flex-row md:items-end md:text-left md:justify-between mb-20 border-b border-white/10 pb-8">
            <div>
              <span className="text-stone-500 text-xs font-bold tracking-[0.2em] uppercase mb-4 block">Our Expertise</span>
              <h2 className="text-4xl text-white font-light tracking-tight">
                Curated <span className="font-semibold text-stone-200">Services</span>
              </h2>
            </div>

            <Link to="/services" className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400 hover:text-white transition-colors pb-2">
              More Services <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="group relative h-[500px] w-full overflow-hidden bg-stone-900 rounded-2xl shadow-2xl border border-white/5"
                >
                  <img
                    src={getServiceImage(service)}
                    alt={service.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-90"
                    loading="lazy" /* ✅ Lazy load service images */
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400x600?text=No+Image'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90"></div>
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <div className="flex justify-between items-center text-stone-300 text-xs tracking-widest uppercase mb-4">
                        <span className="flex items-center gap-2"><Clock className="w-3 h-3 text-stone-400" /> {service.duration} Mins</span>
                        <span className="text-white font-bold text-lg">₹{service.price}</span>
                      </div>
                      <h3 className="text-3xl text-white font-light mb-4">{service.name}</h3>
                      <p className="text-stone-300 text-sm line-clamp-2 mb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 font-light leading-relaxed hidden md:block">
                        {service.description}
                      </p>
                      <button
                        onClick={handleBookClick}
                        className="inline-block w-full py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white text-center text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300 rounded-xl"
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center md:hidden">
            <Link to="/services" className="text-sm font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800 pb-1 hover:text-white transition-colors">
              View Full Menu
            </Link>
          </div>
        </div>
      </section>

      {/* --- GALLERY SECTION --- */}
      <div className="bg-stone-900 border-t border-white/5">
        <Gallery />
      </div>

      {/* --- FOOTER --- */}
      <footer className="bg-black text-stone-500 py-20 border-t border-white/10 text-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">

            <div className="flex items-center gap-4 mb-6">
              <img
                src="/Gallery/logo.jpg"
                alt="Flawless Logo"
                className="h-14 w-14 object-contain rounded-full border border-white/20"
              />

              {/* 🔒 SECRET TAP AREA START */}
              <div
                className="flex flex-col cursor-pointer select-none active:scale-95 transition-transform"
                onClick={handleSecretTap}
              >
                <span className="text-xl text-white font-light tracking-tight uppercase leading-none">
                  Flawless
                </span>
                <span className="text-[10px] text-stone-400 tracking-[0.2em] uppercase mt-1">
                  by Drashti
                </span>
              </div>
              {/* 🔒 SECRET TAP AREA END */}

            </div>

            <p className="max-w-xs font-light leading-relaxed mb-6">
              Defining modern beauty standards through excellence, innovation, and personalized care.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-xs">Menu</h4>
            <ul className="space-y-4 font-light">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Services</Link></li>
              <li><Link to="/booking" className="hover:text-white transition-colors">Book</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-xs">Contact</h4>
            <ul className="space-y-4 font-light">
              <li>+91 91734 01915</li>
              <li>drashtikapadia26@gmail.com</li>
              <li>Surat, India</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-16 pt-8 border-t border-white/5 text-center text-xs">
          <p>© 2026 Flawless. All rights reserved.</p>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn px-4">
          <div className="bg-stone-900 border border-white/10 p-8 max-w-md w-full shadow-2xl relative animate-fadeInUp rounded-2xl">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 bg-stone-800">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl text-white font-light tracking-widest uppercase mb-3">
                Account Required
              </h3>
              <p className="text-stone-400 text-sm mb-8 font-light leading-relaxed">
                To ensure a personalized experience and secure your reservation, please sign in or create a new account.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={() => navigate('/login')} className="w-full flex items-center justify-center gap-2 py-4 bg-white text-black rounded-xl hover:bg-stone-200 transition-all text-xs font-bold uppercase tracking-widest">
                  <LogIn className="w-4 h-4" /> Sign In
                </button>
                <button onClick={() => navigate('/signup')} className="w-full flex items-center justify-center gap-2 py-4 border border-white/20 text-white rounded-xl hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest">
                  <UserPlus className="w-4 h-4" /> Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Homepage;