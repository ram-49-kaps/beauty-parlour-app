import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clock, ChevronDown, Lock, LogIn, UserPlus, X, Sparkles } from 'lucide-react';
import { getServices } from '../services/api';
import Gallery from '../components/Gallery';
import { useAuth } from "../context/AuthContext";
import { useTheme } from '../context/ThemeContext';
import { getImageUrl } from '../config';

const Homepage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  useEffect(() => { fetchServices(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => setTapCount(0), 1000);
    return () => clearTimeout(timer);
  }, [tapCount]);

  const handleSecretTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount === 5) { navigate('/secure-owner-portal-2026'); setTapCount(0); }
  };

  const fetchServices = async () => {
    try {
      const response = await getServices();
      const allServices = response.data;
      const mainServices = allServices.filter(service => {
        const name = service.name.toLowerCase();
        return !name.includes('lash') && !name.includes('lens');
      });
      setServices(mainServices.slice(0, 3));
    } catch (error) { console.error('Error fetching services:', error); }
    finally { setLoading(false); }
  };

  const handleBookClick = () => { user ? navigate('/booking') : setShowLoginModal(true); };

  const getServiceImage = (service) => {
    const path = service.image_url || service.image;
    if (!path) return 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800';
    return getImageUrl(path);
  };

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-stone-950 text-white' : 'bg-white text-gray-900'} selection:bg-gray-900 selection:text-white`}>

      {/* HERO SECTION (always dark overlay on image - white text) */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            srcSet="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=600&auto=format&fit=crop 600w, https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1200&auto=format&fit=crop 1200w, https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=2070&auto=format&fit=crop 2000w"
            sizes="(max-width: 600px) 600px, (max-width: 1200px) 1200px, 2000px"
            src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=2070&auto=format&fit=crop"
            alt="Luxury Salon Interior" className="w-full h-full object-cover opacity-70" fetchPriority="high" loading="eager"
          />
          <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-b from-black/60 via-black/30 to-stone-950' : 'bg-gradient-to-b from-black/70 via-black/25 to-white/95'}`}></div>
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 py-1 px-4 border border-white/30 rounded-full bg-black/20 backdrop-blur-md mb-8">
            <Sparkles className="w-3 h-3 text-white" />
            <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-white">Est. 2026 • Surat, India</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight leading-tight mb-8 text-white">
            Unveil Your <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">True Elegance</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            A sanctuary where modern artistry meets timeless beauty. Experience premium care tailored exclusively for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <button onClick={handleBookClick} className="w-full sm:w-auto px-10 py-4 bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-gray-100 transition-all duration-300 rounded-full shadow-lg">
              {user ? 'Book Now' : 'Join Us'}
            </button>
            <a href="#services" className="w-full sm:w-auto px-10 py-4 border border-white/40 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition-all duration-300 backdrop-blur-sm rounded-full">View Services</a>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400 animate-bounce"><ChevronDown className="w-6 h-6" /></div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" className={`py-20 relative ${isDark ? 'bg-stone-950' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`flex flex-col items-center text-center md:flex-row md:items-end md:text-left md:justify-between mb-20 border-b pb-8 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div>
              <span className={`text-xs font-bold tracking-[0.2em] uppercase mb-4 block ${isDark ? 'text-stone-500' : 'text-gray-400'}`}>Our Expertise</span>
              <h2 className={`text-4xl font-light tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Curated <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}>Services</span>
              </h2>
            </div>
            <Link to="/services" className={`hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-2 transition-colors ${isDark ? 'text-stone-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
              More Services <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className={`w-12 h-12 border-2 rounded-full animate-spin ${isDark ? 'border-white/10 border-t-white' : 'border-gray-200 border-t-gray-800'}`}></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {services.map((service) => (
                <div key={service.id} className={`group relative h-[500px] w-full overflow-hidden rounded-2xl shadow-lg border ${isDark ? 'bg-stone-900 border-white/5' : 'bg-gray-100 border-gray-100'}`}>
                  <img src={getServiceImage(service)} alt={service.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" loading="lazy" onError={(e) => { e.target.src = 'https://via.placeholder.com/400x600?text=No+Image'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80"></div>
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <div className="flex justify-between items-center text-white/80 text-xs tracking-widest uppercase mb-4">
                        <span className="flex items-center gap-2"><Clock className="w-3 h-3 text-white/60" /> {service.duration} Mins</span>
                        <span className="text-white font-bold text-lg">₹{service.price}</span>
                      </div>
                      <h3 className="text-3xl text-white font-light mb-4">{service.name}</h3>
                      <p className="text-white/70 text-sm line-clamp-2 mb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 font-light leading-relaxed hidden md:block">{service.description}</p>
                      <button onClick={handleBookClick} className="inline-block w-full py-4 bg-white/20 backdrop-blur-md border border-white/30 text-white text-center text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300 rounded-xl">Book Appointment</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center md:hidden">
            <Link to="/services" className={`text-sm font-bold uppercase tracking-wider pb-1 transition-colors ${isDark ? 'text-stone-500 border-b border-stone-700 hover:text-white' : 'text-gray-400 border-b border-gray-300 hover:text-gray-900'}`}>View Full Menu</Link>
          </div>
        </div>
      </section>

      {/* GALLERY SECTION */}
      <div className={`${isDark ? 'bg-stone-900 border-t border-white/5' : 'bg-gray-50 border-t border-gray-200'}`}>
        <Gallery />
      </div>

      {/* FOOTER (always dark) */}
      <footer className="bg-black text-gray-400 py-20 border-t border-gray-800 text-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-4 mb-6">
              <img src="/Gallery/logo.jpg" alt="Flawless Logo" className="h-14 w-14 object-contain rounded-full border border-gray-700" />
              <div className="flex flex-col cursor-pointer select-none active:scale-95 transition-transform" onClick={handleSecretTap}>
                <span className="text-xl text-white font-light tracking-tight uppercase leading-none">Flawless</span>
                <span className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mt-1">by Drashti</span>
              </div>
            </div>
            <p className="max-w-xs font-light leading-relaxed mb-6">Defining modern beauty standards through excellence, innovation, and personalized care.</p>
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
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-16 pt-8 border-t border-gray-800 text-center text-xs"><p>© 2026 Flawless. All rights reserved.</p></div>
      </footer>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn px-4">
          <div className={`${isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-gray-200'} border p-8 max-w-md w-full shadow-2xl relative animate-fadeInUp rounded-2xl`}>
            <button onClick={() => setShowLoginModal(false)} className={`absolute top-4 right-4 transition-colors ${isDark ? 'text-stone-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}><X className="w-5 h-5" /></button>
            <div className="text-center">
              <div className={`w-16 h-16 border rounded-full flex items-center justify-center mx-auto mb-6 ${isDark ? 'border-white/10 bg-stone-800' : 'border-gray-200 bg-gray-50'}`}>
                <Lock className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-700'}`} />
              </div>
              <h3 className={`text-xl font-light tracking-widest uppercase mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Account Required</h3>
              <p className={`text-sm mb-8 font-light leading-relaxed ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                To ensure a personalized experience and secure your reservation, please sign in or create a new account.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={() => navigate('/login')} className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-bold uppercase tracking-widest ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                  <LogIn className="w-4 h-4" /> Sign In
                </button>
                <button onClick={() => navigate('/signup')} className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-bold uppercase tracking-widest border ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
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
