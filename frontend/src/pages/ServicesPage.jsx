import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowUpRight, Search, Filter, X, Sparkles } from 'lucide-react';
import { getServices } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getImageUrl } from '../config';

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const categories = ['all', 'Makeup', 'Skincare', 'Hair', 'Bridal', 'Combo', 'Other'];

  useEffect(() => { fetchServices(); }, []);

  useEffect(() => {
    let result = services;
    if (searchTerm) result = result.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedCategory !== 'all') result = result.filter(s => s.category?.toLowerCase() === selectedCategory.toLowerCase());
    if (minPrice) result = result.filter(s => parseFloat(s.price) >= parseFloat(minPrice));
    if (maxPrice) result = result.filter(s => parseFloat(s.price) <= parseFloat(maxPrice));
    setFilteredServices(result);
  }, [services, searchTerm, selectedCategory, minPrice, maxPrice]);

  const fetchServices = async () => {
    try { const res = await getServices(); setServices(res.data); setFilteredServices(res.data); }
    catch (e) { console.error('Error:', e); }
    finally { setLoading(false); }
  };

  const handleBook = () => { user ? navigate('/booking') : navigate('/login'); };

  const getServiceImage = (service) => {
    const path = service.image_url || service.image;
    if (!path) return 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800';
    return getImageUrl(path);
  };

  const clearFilters = () => { setSearchTerm(''); setSelectedCategory('all'); setMinPrice(''); setMaxPrice(''); };

  return (
    <div className={`min-h-screen font-sans pt-24 pb-20 selection:bg-gray-900 selection:text-white ${isDark ? 'bg-stone-950 text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16 animate-fadeInUp">
          <div className={`inline-block py-1 px-4 border rounded-full mb-6 ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
            <span className={`text-[10px] font-bold tracking-[0.3em] uppercase ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>Our Full Menu</span>
          </div>
          <h1 className={`text-4xl md:text-6xl font-light mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Service <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}>Collection</span>
          </h1>
          <p className={`max-w-xl mx-auto font-light leading-relaxed ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
            Each treatment is curated with premium products and expert care.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className={`flex flex-col sm:flex-row gap-4 mb-12 pb-8 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="relative flex-1 group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-stone-500 group-focus-within:text-white' : 'text-gray-400 group-focus-within:text-gray-900'}`} />
            <input type="text" placeholder="Search treatments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-4 rounded-xl text-sm focus:outline-none transition-all border ${isDark
                ? 'bg-stone-900 border-white/10 focus:border-white/30 text-white placeholder-stone-500'
                : 'bg-gray-50 border-gray-200 focus:border-gray-400 text-gray-900 placeholder-gray-400'}`} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${isDark
              ? 'border-white/10 text-stone-400 hover:text-white hover:border-white/30'
              : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400'}`}>
            <Filter className="w-4 h-4" /> Filters {showFilters && <X className="w-3 h-3 ml-2" />}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className={`mb-10 p-6 rounded-2xl border animate-fadeInUp ${isDark ? 'bg-stone-900 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Categories */}
              <div className="flex-1">
                <label className={`block text-xs font-bold uppercase tracking-widest mb-3 ml-1 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${selectedCategory === cat
                        ? (isDark ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900')
                        : (isDark ? 'bg-transparent border-white/10 text-stone-400 hover:border-white/30' : 'bg-transparent border-gray-200 text-gray-500 hover:border-gray-400')}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              {/* Price */}
              <div className="flex gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-3 ml-1 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Min ₹</label>
                  <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0"
                    className={`w-24 px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-stone-800 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-3 ml-1 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Max ₹</label>
                  <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="5000"
                    className={`w-24 px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-stone-800 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                </div>
              </div>
            </div>
            {(searchTerm || selectedCategory !== 'all' || minPrice || maxPrice) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <button onClick={clearFilters} className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors">Clear All Filters</button>
              </div>
            )}
          </div>
        )}

        {/* Results + Grid */}
        <div className={`flex justify-between items-center mb-8 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>
          <span className="text-xs font-bold uppercase tracking-widest">{filteredServices.length} treatments found</span>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className={`w-12 h-12 border-2 rounded-full animate-spin ${isDark ? 'border-white/10 border-t-white' : 'border-gray-200 border-t-gray-800'}`}></div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className={`text-center py-20 border border-dashed rounded-2xl ${isDark ? 'border-white/10' : 'border-gray-300'}`}>
            <p className={`text-sm mb-4 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>No treatments match your criteria</p>
            <button onClick={clearFilters} className={`px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>Clear Filters</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {filteredServices.map((service) => (
              <div key={service.id} className={`group rounded-2xl overflow-hidden shadow-lg border transition-all hover:shadow-xl ${isDark ? 'bg-stone-900 border-white/5 hover:border-white/10' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                <div className="relative h-56 overflow-hidden">
                  <img src={getServiceImage(service)} alt={service.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">₹{service.price}</div>
                  {service.category && (
                    <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">{service.category}</div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{service.name}</h3>
                  <p className={`text-sm font-light line-clamp-2 mb-4 h-10 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>{service.description}</p>
                  <div className={`flex items-center justify-between pt-4 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-stone-500' : 'text-gray-400'}`}><Clock className="w-3 h-3" /> {service.duration} Mins</span>
                    <button onClick={handleBook} className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? 'text-white hover:text-stone-300' : 'text-gray-900 hover:text-gray-600'}`}>
                      Book <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-20 animate-fadeInUp">
          <button onClick={handleBook} className={`px-10 py-5 text-xs font-bold uppercase tracking-widest rounded-full shadow-lg transition-all ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
            <Sparkles className="w-3 h-3 inline mr-2" />
            {user ? 'Book Your Appointment' : 'Sign In to Book'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;