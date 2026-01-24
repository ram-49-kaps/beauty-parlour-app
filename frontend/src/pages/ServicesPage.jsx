import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, IndianRupee, ArrowRight, Search, Lock, UserPlus, LogIn, X, Sparkles } from 'lucide-react';
import { getServices } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [searchTerm, priceFilter, services]);

  const fetchServices = async () => {
    try {
      const response = await getServices();
      setServices(response.data);
      setFilteredServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = [...services];

    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (priceFilter !== 'all') {
      filtered = filtered.filter(service => {
        const price = parseFloat(service.price);
        
        // Logic for Add-ons (Lens/Lashes are around 100-150)
        if (priceFilter === 'addons') return price < 1000;
        
        // Logic for Main Makeup (Basic is 2500, HD is 3500)
        if (priceFilter === 'signature') return price >= 2000 && price < 4000;
        
        // Logic for Glam Makeup (4500)
        if (priceFilter === 'luxury') return price >= 4000;
        
        return true;
      });
    }
    setFilteredServices(filtered);
  };

  const handleBookClick = () => {
    if (user) {
      navigate('/booking');
    } else {
      setShowLoginModal(true);
    }
  };

  const priceOptions = [
    { id: 'all', label: 'All Services' },
    { id: 'addons', label: 'Add-ons (< ₹1000)' },
    { id: 'signature', label: 'Signature (₹2000-4000)' },
    { id: 'luxury', label: 'Luxury (₹4000+)' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-stone-800 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-500 text-xs font-bold tracking-widest uppercase">Loading Menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white font-sans selection:bg-white selection:text-black pt-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        
        {/* Header */}
        <div className="text-center mb-16 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 py-1 px-4 border border-white/10 rounded-full bg-white/5 backdrop-blur-sm mb-6">
            <Sparkles className="w-3 h-3 text-stone-300" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-300">
              Exclusive Services
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-light text-white mb-6 tracking-tight">
            Refined <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400">Services</span>
          </h1>
          <p className="text-stone-400 max-w-xl mx-auto font-light leading-relaxed text-lg">
            Discover treatments designed to enhance your natural elegance.
          </p>
        </div>

        {/* Modern Filters Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          
          {/* Glass Search Bar */}
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-stone-500 w-4 h-4 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Find your treatment..."
              className="w-full pl-12 pr-6 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-full focus:border-white/30 focus:bg-white/10 focus:outline-none text-white placeholder-stone-500 transition-all text-sm font-medium"
            />
          </div>

          {/* Modern Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
            {priceOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setPriceFilter(option.id)}
                className={`whitespace-nowrap px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${
                  priceFilter === option.id
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                    : 'bg-transparent text-stone-400 border-white/10 hover:border-white/30 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-8 flex items-center gap-4 text-stone-500 text-sm font-light border-b border-white/5 pb-4">
           <span>Found <span className="text-white font-semibold">{filteredServices.length}</span> treatments matching your criteria</span>
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-32 bg-stone-900/30 rounded-3xl border border-dashed border-white/10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-800 rounded-full mb-4">
              <Search className="w-6 h-6 text-stone-500" />
            </div>
            <h3 className="text-xl font-light text-white mb-2">No treatments found</h3>
            <p className="text-stone-500 text-sm">We couldn't find matches for "{searchTerm}".</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map((service, index) => {
              
              const isAddOn = service.name.toLowerCase().includes('lash') || service.name.toLowerCase().includes('lens');

              return (
                <div
                  key={service.id}
                  className="group bg-stone-900 border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-500 animate-fadeInUp flex flex-col h-full hover:shadow-2xl hover:shadow-black/50"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="relative h-72 overflow-hidden flex-shrink-0">
                    <img
                      src={service.image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800'}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent"></div>
                    
                    <div className="absolute top-4 right-4">
                       <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-1 shadow-lg">
                        <IndianRupee className="w-3 h-3 text-stone-300" />
                        <span className="text-white font-bold text-sm">{service.price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 relative flex flex-col flex-grow">
                    <div className="absolute -top-5 left-8 bg-stone-800 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-10">
                      <Clock className="w-3 h-3 text-stone-400" />
                      <span className="text-[10px] font-bold tracking-widest uppercase text-stone-300">{service.duration} MIN</span>
                    </div>

                    <h3 className="text-2xl font-light text-white mb-3 group-hover:text-stone-200 transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-stone-400 mb-8 leading-relaxed font-light line-clamp-2 text-sm">
                      {service.description}
                    </p>
                    
                    <div className="mt-auto w-full">
                      {isAddOn ? (
                        <div className="flex items-center justify-center w-full py-4 border border-white/5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-stone-500 bg-white/5 cursor-not-allowed">
                          Available as Add-on in Booking
                        </div>
                      ) : (
                        <button
                          onClick={handleBookClick}
                          className="flex items-center justify-between w-full py-4 px-6 bg-white text-black rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-stone-200 transition-all duration-300 group/btn"
                        >
                          <span>Book Now</span>
                          <ArrowRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. RESTORED: The "Ready to Transform" Section */}
        <div className="mt-20 border-t border-white/10 pt-20 text-center">
          <h2 className="text-3xl md:text-5xl font-light mb-6">
            Ready to <span className="font-semibold text-white">Transform?</span>
          </h2>
          <p className="text-stone-400 text-lg mb-10 max-w-2xl mx-auto font-light">
            Secure your exclusive session today and receive a complimentary consultation with our senior stylists.
          </p>
          <button
            onClick={handleBookClick}
            className="inline-flex items-center gap-4 bg-white text-black px-10 py-4 rounded-full hover:bg-stone-200 transition-all duration-300 font-bold text-xs uppercase tracking-widest"
          >
            Book Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-white/10 p-8 max-w-md w-full mx-6 shadow-2xl relative animate-fadeInUp">
            
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
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-white text-black rounded-lg hover:bg-stone-200 transition-all text-xs font-bold uppercase tracking-widest"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
                
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full flex items-center justify-center gap-2 py-4 border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;