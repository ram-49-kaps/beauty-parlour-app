import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Mail, Phone, User, MessageSquare, CheckCircle, Sparkles, ArrowRight, IndianRupee, Plus, Check } from 'lucide-react';
import { getServices, createBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BookingPage = () => {
  // Data States
  const [mainServices, setMainServices] = useState([]);
  const [addOnServices, setAddOnServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Selection States
  const [selectedAddOns, setSelectedAddOns] = useState([]); // Array of IDs

  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_phone: '',
    service_id: '',
    booking_date: '',
    booking_time: '',
    notes: ''
  });

  // Redirect to Home if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await getServices();
      const allServices = response.data;

      // 1. LOGIC: Filter Main vs Add-ons
      // We assume "Lash" and "Lens" are extras. Everything else is a main service.
      const extras = allServices.filter(s => 
        s.name.toLowerCase().includes('lash') || 
        s.name.toLowerCase().includes('lens')
      );
      const main = allServices.filter(s => 
        !s.name.toLowerCase().includes('lash') && 
        !s.name.toLowerCase().includes('lens')
      );

      setMainServices(main);
      setAddOnServices(extras);
    } catch (error) {
      console.error('Error fetching services:', error);
      setError('Failed to load services. Please refresh the page.');
    }
  };

  // 2. LOGIC: Toggle Checkboxes for Add-ons
  const toggleAddOn = (id) => {
    if (selectedAddOns.includes(id)) {
      setSelectedAddOns(selectedAddOns.filter(itemId => itemId !== id));
    } else {
      setSelectedAddOns([...selectedAddOns, id]);
    }
  };

  // 3. LOGIC: Calculate Total Price
  const calculateTotal = () => {
    // Price of Main Service
    const selectedMain = mainServices.find(s => s.id === parseInt(formData.service_id));
    const mainPrice = selectedMain ? parseFloat(selectedMain.price) : 0;

    // Price of Selected Add-ons
    const addOnPrice = selectedAddOns.reduce((total, id) => {
      const extra = addOnServices.find(s => s.id === id);
      return total + (extra ? parseFloat(extra.price) : 0);
    }, 0);

    return mainPrice + addOnPrice;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone || 
        !formData.service_id || !formData.booking_date || !formData.booking_time) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customer_email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.customer_phone)) {
      setError('Please enter a valid 10-digit phone number');
      setLoading(false);
      return;
    }

    const selectedDate = new Date(formData.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setError('Please select a future date');
      setLoading(false);
      return;
    }

    try {
      // 4. LOGIC: Add selected add-ons to notes so the salon knows
      const selectedAddOnNames = addOnServices
        .filter(s => selectedAddOns.includes(s.id))
        .map(s => s.name)
        .join(', ');

      const finalNotes = selectedAddOnNames 
        ? `Extras: ${selectedAddOnNames}. \nUser Notes: ${formData.notes}` 
        : formData.notes;

      const bookingData = {
        ...formData,
        notes: finalNotes,
        user_id: user?.id
      };

      await createBooking(bookingData);
      
      setSuccess(true);
      // Reset Form
      setFormData({
        customer_name: user?.name || '',
        customer_email: user?.email || '',
        customer_phone: '',
        service_id: '',
        booking_date: '',
        booking_time: '',
        notes: ''
      });
      setSelectedAddOns([]); // Reset add-ons

      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccess(false), 8000);
    } catch (error) {
      console.error('Booking error:', error);
      setError(error.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedMainService = mainServices.find(s => s.id === parseInt(formData.service_id));

  const timeSlots = [];
  for (let hour = 9; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break;
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-white pt-40 pb-20 px-6 selection:bg-white selection:text-black py-20">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16 animate-fadeInUp">
          <div className="inline-block py-1 px-4 border border-white/10 rounded-full bg-white/5 backdrop-blur-sm mb-6">
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-stone-400">
              Online Reservations
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-light text-white mb-6">
            Secure Your <span className="font-semibold text-stone-300">Appointment</span>
          </h1>
          <p className="text-stone-400 max-w-xl mx-auto font-light leading-relaxed">
            Select your preferred treatment and time. Our team will ensure everything is perfect for your arrival.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-8 bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-8 flex items-start gap-4 shadow-2xl animate-fadeInUp">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-500/50">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-light text-emerald-200 mb-2 tracking-wide">Reservation Received</h3>
              <p className="text-emerald-400/80 font-light text-sm leading-relaxed">
                Your request is being processed. You can now view this booking in your <strong>Profile</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-950/30 border border-red-500/30 rounded-xl p-6 text-red-300 shadow-2xl animate-fadeInUp text-sm font-light flex items-center gap-3">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            {error}
          </div>
        )}

        {/* Booking Form */}
        <div className="bg-stone-900 border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit} className="p-8 md:p-12">
            
            {/* Personal Information */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <User className="w-5 h-5 text-stone-400" />
                <h2 className="text-xl font-light tracking-wide text-white">Client Details</h2>
              </div>
              
              <div className="grid gap-6">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">
                    Full Name <span className="text-white">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    className="w-full px-4 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white placeholder-stone-700 transition-all text-sm tracking-wide"
                    placeholder="ENTER YOUR NAME"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">
                      Email Address <span className="text-white">*</span>
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-600 w-4 h-4 group-focus-within:text-white transition-colors" />
                      <input
                        type="email"
                        name="customer_email"
                        value={formData.customer_email}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white placeholder-stone-700 transition-all text-sm tracking-wide"
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">
                      Phone Number <span className="text-white">*</span>
                    </label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-600 w-4 h-4 group-focus-within:text-white transition-colors" />
                      <input
                        type="tel"
                        name="customer_phone"
                        value={formData.customer_phone}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white placeholder-stone-700 transition-all text-sm tracking-wide"
                        placeholder="9876543210"
                        pattern="[0-9]{10}"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Selection */}
            <div className="space-y-8 mt-12 pt-12 border-t border-white/5">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Sparkles className="w-5 h-5 text-stone-400" />
                <h2 className="text-xl font-light tracking-wide text-white">Treatment Selection</h2>
              </div>
              
              {/* MAIN SERVICE DROPDOWN */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">
                  Choose Main Service <span className="text-white">*</span>
                </label>
                <div className="relative">
                  <select
                    name="service_id"
                    value={formData.service_id}
                    onChange={handleChange}
                    className="w-full px-4 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white appearance-none cursor-pointer text-sm tracking-wide"
                    required
                  >
                    <option value="">SELECT A TREATMENT</option>
                    {mainServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} (₹{service.price})
                      </option>
                    ))}
                  </select>
                   <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* SELECTED MAIN SERVICE INFO */}
              {selectedMainService && (
                <div className="bg-stone-800/50 p-6 rounded-xl border border-white/5 animate-fadeInUp flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                     <h3 className="text-lg font-light text-white mb-1">{selectedMainService.name}</h3>
                     <p className="text-stone-500 text-xs font-light tracking-wide">{selectedMainService.description}</p>
                  </div>
                  <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 w-full md:w-auto mt-2 md:mt-0">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-stone-400" />
                      <span className="text-sm font-bold text-stone-300">{selectedMainService.duration} MIN</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ADD-ONS SECTION (Only shows if Main Service is selected and Add-ons exist) */}
              {selectedMainService && addOnServices.length > 0 && (
                <div className="animate-fadeIn mt-6">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
                    <Plus className="w-3 h-3" /> Enhance Your Experience (Optional)
                  </label>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {addOnServices.map((extra) => (
                      <div 
                        key={extra.id}
                        onClick={() => toggleAddOn(extra.id)}
                        className={`
                          cursor-pointer relative p-4 rounded-xl border transition-all duration-300 flex items-center justify-between
                          ${selectedAddOns.includes(extra.id) 
                            ? 'bg-stone-800 border-white/40 shadow-lg' 
                            : 'bg-stone-950 border-white/10 hover:border-white/20 hover:bg-stone-900'}
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                            ${selectedAddOns.includes(extra.id) ? 'bg-white border-white' : 'border-stone-600'}
                          `}>
                            {selectedAddOns.includes(extra.id) && <Check className="w-3 h-3 text-black" />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${selectedAddOns.includes(extra.id) ? 'text-white' : 'text-stone-300'}`}>
                              {extra.name}
                            </p>
                            <p className="text-xs text-stone-500 mt-0.5 font-light">{extra.description}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-stone-300">₹{extra.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DATE & TIME SELECTION */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">
                    Preferred Date <span className="text-white">*</span>
                  </label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-600 w-4 h-4 group-focus-within:text-white transition-colors pointer-events-none" />
                    <input
                      type="date"
                      name="booking_date"
                      value={formData.booking_date}
                      onChange={handleChange}
                      min={todayStr}
                      className="w-full pl-12 pr-4 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white placeholder-stone-700 transition-all text-sm tracking-wide uppercase"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">
                    Preferred Time <span className="text-white">*</span>
                  </label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-600 w-4 h-4 group-focus-within:text-white transition-colors pointer-events-none" />
                    <select
                      name="booking_time"
                      value={formData.booking_time}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white appearance-none cursor-pointer transition-all text-sm tracking-wide"
                      required
                    >
                      <option value="">SELECT TIME</option>
                      {timeSlots.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                     <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">
                  Special Requests (Optional)
                </label>
                <div className="relative group">
                  <MessageSquare className="absolute left-4 top-4 text-stone-600 w-4 h-4 group-focus-within:text-white transition-colors" />
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="4"
                    className="w-full pl-12 pr-4 py-4 bg-stone-950 border border-white/10 rounded-xl focus:border-white/40 focus:outline-none text-white placeholder-stone-700 transition-all resize-none text-sm leading-relaxed"
                    placeholder="Any allergies or specific requirements?"
                  />
                </div>
              </div>
            </div>

            {/* TOTAL PRICE BAR & SUBMIT */}
            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              
              <div className="text-center md:text-left">
                <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Total Payable</p>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                   <IndianRupee className="w-6 h-6 text-white" />
                   <span className="text-4xl font-light text-white tracking-tight">{calculateTotal()}</span>
                </div>
                {selectedAddOns.length > 0 && (
                   <p className="text-stone-500 text-xs mt-2">Includes {selectedAddOns.length} extra(s)</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-10 bg-white text-black py-5 rounded-xl hover:bg-stone-200 transition-all duration-300 font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                    Securing Slot...
                  </>
                ) : (
                  <>
                    Confirm Reservation
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div className="mt-12 border border-white/5 rounded-xl p-8 bg-stone-900/50 backdrop-blur-sm animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <h3 className="font-bold text-stone-300 mb-6 text-xs uppercase tracking-widest flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-white" />
            Booking Policy
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-stone-500 text-xs font-light tracking-wide leading-relaxed">
            <div className="flex items-start gap-3">
              <span className="text-white mt-0.5">•</span>
              <span>All appointments are subject to availability and confirmation by our concierge team.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-white mt-0.5">•</span>
              <span>Please arrive 10 minutes prior to your scheduled time to complete any necessary consultation forms.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-white mt-0.5">•</span>
              <span>Cancellations must be made at least 24 hours in advance to avoid a cancellation fee.</span>
            </div>
             <div className="flex items-start gap-3">
              <span className="text-white mt-0.5">•</span>
              <span>Confirmation emails are sent immediately upon successful booking request.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;