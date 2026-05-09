import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, Mail, Phone, User, MessageSquare, CheckCircle, Sparkles, ArrowRight, IndianRupee, Plus, Check, Tag, Gift, ShieldCheck, Timer, AlertCircle, FileDown } from 'lucide-react';
import { generateReceipt } from '../utils/receiptGenerator';
import { getServices, createPaymentOrder, verifyPayment, getBookedSlots, validateCoupon, checkCouponEligibility, getServiceRecommendations, getBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast, { Toaster } from 'react-hot-toast';

const BookingPage = () => {
  const [mainServices, setMainServices] = useState([]);
  const [addOnServices, setAddOnServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [lastBooking, setLastBooking] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponEligible, setCouponEligible] = useState(null);
  const [showCoupon, setShowCoupon] = useState(false);
  const [recommendations, setRecommendations] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_phone: '',
    customer_city: '',
    service_id: '',
    booking_date: '',
    booking_time: '',
    notes: ''
  });

  const citiesList = ['Surat', 'Mumbai', 'Ahmedabad', 'Vadodara', 'Bharuch', 'Rajkot', 'Pune', 'Delhi', 'Bengaluru', 'Other'];

  // ===== FIELD-LEVEL VALIDATION =====
  const validateField = (name, value) => {
    switch (name) {
      case 'customer_name':
        if (!value?.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        if (value.trim().length > 100) return 'Name must be under 100 characters';
        return '';
      case 'customer_email':
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
        return '';
      case 'customer_phone':
        if (!value) return 'Phone number is required';
        if (!/^[0-9]{10}$/.test(value)) return 'Enter a valid 10-digit phone number';
        return '';
      case 'customer_city':
        if (!value) return 'Please select your city';
        return '';
      case 'service_id':
        if (!value) return 'Please select a service';
        return '';
      case 'booking_date': {
        if (!value) return 'Please select a date';
        const d = new Date(value);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (isNaN(d.getTime())) return 'Invalid date';
        if (d < today) return 'Date must be today or later';
        return '';
      }
      case 'booking_time':
        if (!value) return 'Please select a time slot';
        return '';
      default:
        return '';
    }
  };

  const validateAllFields = () => {
    const errors = {};
    const fields = ['customer_name', 'customer_email', 'customer_phone', 'customer_city', 'service_id', 'booking_date', 'booking_time'];
    fields.forEach(f => {
      const err = validateField(f, formData[f]);
      if (err) errors[f] = err;
    });
    return errors;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    // Only clear the field error if user already touched this field
    if (touched[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  };
  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    fetchServices();
    fetchCouponEligibility();
    loadRazorpayScript();
    
    // Check for pre-fill ID from URL
    const params = new URLSearchParams(location.search);
    const bookingId = params.get('id');
    if (bookingId) {
      prefillBooking(bookingId);
    }
  }, [location.search]);

  const prefillBooking = async (id) => {
    try {
      const res = await getBooking(id);
      if (res.data) {
        const d = res.data;
        
        // Format date string to YYYY-MM-DD
        let formattedDate = d.booking_date;
        if (formattedDate && formattedDate.includes('T')) {
           formattedDate = formattedDate.split('T')[0];
        }

        setFormData(prev => ({
          ...prev,
          customer_name: d.customer_name || prev.customer_name,
          customer_email: d.customer_email || prev.customer_email,
          customer_phone: d.customer_phone || prev.customer_phone,
          customer_city: d.customer_city || prev.customer_city,
          service_id: d.service_id || prev.service_id,
          booking_date: formattedDate || prev.booking_date,
          booking_time: d.booking_time || prev.booking_time,
          notes: d.notes || prev.notes
        }));
        toast.success("Booking details loaded from chatbot!");
      }
    } catch (err) {
      console.error("Failed to fetch booking details for prefill:", err);
      toast.error("Failed to load booking details from the link.");
    }
  };

  const loadRazorpayScript = () => {
    if (document.getElementById('razorpay-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const fetchCouponEligibility = async () => {
    try {
      const res = await checkCouponEligibility();
      if (res.data.eligible) setCouponEligible(res.data.coupon);
    } catch (e) { console.error('Coupon check failed', e); }
  };

  const fetchRecommendations = async (city) => {
    if (!city) return;
    try {
      const res = await getServiceRecommendations(city);
      if (res.data.recommendations) {
        const recMap = {};
        res.data.recommendations.forEach(rec => {
          recMap[rec.service_id] = {
            display_text: rec.display_text,
            booking_count: rec.booking_count,
            is_top: rec.is_top,
            rank: rec.rank
          };
        });
        setRecommendations(recMap);
      }
    } catch (e) { console.error('Error fetching recommendations:', e); }
  };

  const fetchServices = async () => {
    try {
      const response = await getServices();
      const allServices = response.data;
      const extras = allServices.filter(s => s.category === 'Add-On');
      const main = allServices.filter(s => s.category !== 'Add-On');
      setMainServices(main);
      setAddOnServices(extras);
    } catch (error) {
      console.error('Error fetching services:', error);
      setError('Failed to load services. Please refresh the page.');
    }
  };

  useEffect(() => {
    if (formData.booking_date) {
      fetchBlockedSlots(formData.booking_date);
    } else {
      setBlockedTimes([]);
    }
  }, [formData.booking_date]);

  useEffect(() => {
    if (formData.customer_city) {
      fetchRecommendations(formData.customer_city);
    }
  }, [formData.customer_city]);

  const fetchBlockedSlots = async (date) => {
    try {
      const response = await getBookedSlots(date);
      const occupied = new Set();
      response.data.forEach(booking => {
        const start = new Date(`${date}T${booking.time}`);
        if (isNaN(start.getTime())) return;
        const startStr = booking.time.substring(0, 5);
        occupied.add(startStr);
        const durationMins = booking.duration || 60;
        const slotsCount = Math.ceil(durationMins / 30);
        for (let i = 1; i < slotsCount; i++) {
          const nextSlot = new Date(start.getTime() + i * 30 * 60000);
          const h = nextSlot.getHours().toString().padStart(2, '0');
          const m = nextSlot.getMinutes().toString().padStart(2, '0');
          occupied.add(`${h}:${m}`);
        }
      });
      setBlockedTimes(Array.from(occupied));
    } catch (err) {
      console.error("Failed to fetch blocked slots", err);
    }
  };

  const toggleAddOn = (id) => {
    if (selectedAddOns.includes(id)) {
      setSelectedAddOns(selectedAddOns.filter(itemId => itemId !== id));
    } else {
      setSelectedAddOns([...selectedAddOns, id]);
    }
  };

  const calculateTotal = () => {
    const selectedMain = mainServices.find(s => s.id === parseInt(formData.service_id));
    const mainPrice = selectedMain ? parseFloat(selectedMain.price) : 0;
    const addOnPrice = selectedAddOns.reduce((total, id) => {
      const extra = addOnServices.find(s => s.id === id);
      return total + (extra ? parseFloat(extra.price) : 0);
    }, 0);
    return mainPrice + addOnPrice;
  };

  const getDiscount = () => couponApplied ? Math.round(calculateTotal() * couponApplied.discount_percent / 100 * 100) / 100 : 0;
  const getFinalTotal = () => calculateTotal() - getDiscount();
  const getAdvance = () => Math.ceil(getFinalTotal() / 2);
  const getRemaining = () => getFinalTotal() - getAdvance();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError('');
    try {
      const res = await validateCoupon(couponCode.trim());
      if (res.data.valid) {
        setCouponApplied({ code: res.data.code, discount_percent: res.data.discount_percent });
        setCouponError('');
        toast.success(`${res.data.discount_percent}% discount applied successfully!`, { icon: '🎉', duration: 3000 });
      } else {
        setCouponError(res.data.message); setCouponApplied(null);
        toast.error(res.data.message || 'Invalid coupon code');
      }
    } catch (e) { setCouponError('Failed to validate coupon.'); setCouponApplied(null); toast.error('Failed to validate coupon'); }
    setCouponLoading(false);
  };

  const removeCoupon = () => { setCouponApplied(null); setCouponCode(''); setCouponError(''); toast('Coupon removed', { icon: '🗑️' }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Mark all fields as touched to show errors
    const allTouched = {};
    ['customer_name', 'customer_email', 'customer_phone', 'customer_city', 'service_id', 'booking_date', 'booking_time'].forEach(f => { allTouched[f] = true; });
    setTouched(allTouched);

    // Validate all fields
    const errors = validateAllFields();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setError(firstError);
      toast.error(firstError, { duration: 3000 });
      setLoading(false);
      // Scroll to first error field
      const firstField = Object.keys(errors)[0];
      const el = document.querySelector(`[name="${firstField}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    try {
      const orderPayload = {
        ...formData,
        coupon_code: couponApplied?.code || null,
        add_on_ids: selectedAddOns
      };

      const orderRes = await createPaymentOrder(orderPayload);
      const { order_id, amount, key_id, booking_details } = orderRes.data;

      const options = {
        key: key_id,
        amount: amount * 100,
        currency: 'INR',
        name: 'Flawless By Drashti',
        image: '/Gallery/logo.jpg',
        description: `50% Advance for ${booking_details.service_name}`,
        order_id: order_id,
        handler: async (response) => {
          try {
            const addOnNames = addOnServices.filter(s => selectedAddOns.includes(s.id)).map(s => s.name);
            const verifyData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ...formData,
              coupon_code: couponApplied?.code || null,
              add_on_ids: selectedAddOns,
              add_on_names: addOnNames
            };
            const verifyRes = await verifyPayment(verifyData);
            const bookingData = {
              id: verifyRes.data?.booking?.id,
              service_name: booking_details.service_name,
              customer_name: formData.customer_name,
              customer_email: formData.customer_email,
              customer_phone: formData.customer_phone,
              date: formData.booking_date,
              time: formData.booking_time,
              total_amount: booking_details.total_amount,
              discount_amount: booking_details.discount_amount,
              advance_amount: booking_details.advance_amount,
              remaining_amount: booking_details.remaining_amount,
              coupon_code: couponApplied?.code || null,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              payment_status: 'advance_paid',
              status: 'pending'
            };
            setLastBooking(bookingData);
            setSuccess(true);
            setFormData({ customer_name: user?.name || '', customer_email: user?.email || '', customer_phone: '', customer_city: '', service_id: '', booking_date: '', booking_time: '', notes: '' });
            setFieldErrors({}); setTouched({});
            setSelectedAddOns([]); setCouponApplied(null); setCouponCode('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setSuccess(false), 30000);
          } catch (err) {
            console.error('Verify error:', err);
            setError('Payment received but booking failed. Please contact support.');
          }
          setLoading(false);
        },
        prefill: { name: formData.customer_name, email: formData.customer_email, contact: formData.customer_phone },
        theme: { color: '#1c1917' },
        modal: { ondismiss: () => { setLoading(false); } }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => { setError(`Payment failed: ${resp.error.description}`); setLoading(false); });
      rzp.open();
    } catch (error) {
      console.error('Booking error:', error);
      setError(error.response?.data?.message || 'Failed to create booking. Please try again.');
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
    <div className={`min-h-screen font-sans pt-40 pb-20 px-6 py-20 transition-colors duration-300 ${isDark ? 'bg-stone-950 text-white selection:bg-white/20' : 'bg-gray-50 text-gray-900 selection:bg-gray-900 selection:text-white'}`}>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: '12px', fontSize: '14px', fontWeight: '500' } }} />
      <div className="max-w-5xl mx-auto px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16 animate-fadeInUp">
          <div className={`inline-block py-1 px-4 border rounded-full mb-6 ${isDark ? 'border-white/10 bg-stone-900' : 'border-gray-200 bg-white'}`}>
            <span className={`text-[10px] font-bold tracking-[0.3em] uppercase ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
              Online Reservations
            </span>
          </div>
          <h1 className={`text-4xl md:text-6xl font-light mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Secure Your <span className={`font-semibold ${isDark ? 'text-stone-400' : 'text-gray-600'}`}>Appointment</span>
          </h1>
          <p className={`max-w-xl mx-auto font-light leading-relaxed ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
            Select your preferred treatment and time. Our team will ensure everything is perfect for your arrival.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-xl p-8 shadow-lg animate-fadeInUp">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-300">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-light text-emerald-800 mb-2 tracking-wide">Payment Successful & Booking Confirmed!</h3>
                <p className="text-emerald-600 font-light text-sm leading-relaxed">
                  Your 50% advance has been received. The remaining balance is payable at the salon after your service.
                </p>
                {lastBooking?.razorpay_payment_id && (
                  <p className="text-emerald-700 text-xs mt-1 font-mono">Payment ID: {lastBooking.razorpay_payment_id}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-6 pl-14">
              {lastBooking && (
                <button
                  type="button"
                  onClick={() => generateReceipt(lastBooking)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" /> Download Receipt
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-6 py-2.5 border border-emerald-300 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all"
              >
                View Booking History
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 shadow-lg animate-fadeInUp text-sm font-light flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            {error}
          </div>
        )}

        {/* Booking Form */}
        <div className={`border rounded-2xl shadow-xl overflow-hidden animate-fadeInUp transition-colors ${isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-gray-200'}`} style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit} className="p-8 md:p-12">

            {/* Personal Information */}
            <div className="space-y-8">
              <div className={`flex items-center gap-3 border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <User className={`w-5 h-5 ${isDark ? 'text-stone-400' : 'text-gray-500'}`} />
                <h2 className={`text-xl font-light tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>Client Details</h2>
              </div>

              <div className="grid gap-6">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                    Full Name <span className={isDark ? 'text-white' : 'text-gray-900'}>*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-4 border rounded-xl focus:outline-none placeholder-gray-400 transition-all text-sm tracking-wide ${fieldErrors.customer_name && touched.customer_name ? (isDark ? 'border-red-500/50 bg-red-500/10' : 'border-red-300 bg-red-50') : (isDark ? 'bg-stone-800 border-white/10 text-white focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400')}`}
                    placeholder="ENTER YOUR NAME"
                    required
                  />
                  {fieldErrors.customer_name && touched.customer_name && <p className="text-red-500 text-xs font-light mt-1 ml-1">{fieldErrors.customer_name}</p>}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                      Email Address <span className={isDark ? 'text-white' : 'text-gray-900'}>*</span>
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-gray-900 dark:group-focus-within:text-white transition-colors" />
                      <input
                        type="email"
                        name="customer_email"
                        value={formData.customer_email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none placeholder-gray-400 transition-all text-sm tracking-wide ${fieldErrors.customer_email && touched.customer_email ? (isDark ? 'border-red-500/50 bg-red-500/10' : 'border-red-300 bg-red-50') : (isDark ? 'bg-stone-800 border-white/10 text-white focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400')}`}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    {fieldErrors.customer_email && touched.customer_email && <p className="text-red-500 text-xs font-light mt-1 ml-1">{fieldErrors.customer_email}</p>}
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                      Phone Number <span className={isDark ? 'text-white' : 'text-gray-900'}>*</span>
                    </label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-gray-900 dark:group-focus-within:text-white transition-colors" />
                      <input
                        type="tel"
                        name="customer_phone"
                        value={formData.customer_phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none placeholder-gray-400 transition-all text-sm tracking-wide ${fieldErrors.customer_phone && touched.customer_phone ? (isDark ? 'border-red-500/50 bg-red-500/10' : 'border-red-300 bg-red-50') : (isDark ? 'bg-stone-800 border-white/10 text-white focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400')}`}
                        placeholder="9876543210"
                        pattern="[0-9]{10}"
                        required
                      />
                    </div>
                    {fieldErrors.customer_phone && touched.customer_phone && <p className="text-red-500 text-xs font-light mt-1 ml-1">{fieldErrors.customer_phone}</p>}
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                      City <span className={isDark ? 'text-white' : 'text-gray-900'}>*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="customer_city"
                        value={formData.customer_city}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full px-4 py-4 border rounded-xl focus:outline-none appearance-none cursor-pointer text-sm tracking-wide ${fieldErrors.customer_city && touched.customer_city ? (isDark ? 'border-red-500/50 bg-red-500/10' : 'border-red-300 bg-red-50') : (isDark ? 'bg-stone-800 border-white/10 text-white focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400')}`}
                        required
                      >
                        <option value="">SELECT YOUR CITY</option>
                        {citiesList.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                    {fieldErrors.customer_city && touched.customer_city && <p className="text-red-500 text-xs font-light mt-1 ml-1">{fieldErrors.customer_city}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Service Selection */}
            <div className={`space-y-8 mt-12 pt-12 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className={`flex items-center gap-3 border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <Sparkles className={`w-5 h-5 ${isDark ? 'text-stone-400' : 'text-gray-500'}`} />
                <h2 className={`text-xl font-light tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>Treatment Selection</h2>
              </div>

              {/* MAIN SERVICE DROPDOWN */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                  Choose Main Service <span className={isDark ? 'text-white' : 'text-gray-900'}>*</span>
                </label>
                <div className="relative">
                  <select
                    name="service_id"
                    value={formData.service_id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-4 border rounded-xl focus:outline-none appearance-none cursor-pointer text-sm tracking-wide ${fieldErrors.service_id && touched.service_id ? (isDark ? 'border-red-500/50 bg-red-500/10' : 'border-red-300 bg-red-50') : (isDark ? 'bg-stone-800 border-white/10 text-white focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400')}`}
                    required
                  >
                    <option value="">SELECT A TREATMENT</option>
                    {mainServices.map((service) => {
                      const rec = recommendations[service.id];
                      const label = rec ? `${service.name} (₹${service.price}) - ${rec.display_text}` : `${service.name} (₹${service.price})`;
                      return (
                        <option key={service.id} value={service.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                {fieldErrors.service_id && touched.service_id && <p className="text-red-500 text-xs font-light mt-1 ml-1">{fieldErrors.service_id}</p>}
              </div>

              {/* SELECTED MAIN SERVICE INFO */}
              {selectedMainService && (
                <div className={`p-6 rounded-xl border animate-fadeInUp flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDark ? 'bg-stone-800 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-lg font-light ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedMainService.name}</h3>
                      {recommendations[selectedMainService.id] && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${recommendations[selectedMainService.id].is_top ? (isDark ? 'bg-red-600 text-white' : 'bg-red-100 text-red-900') : (isDark ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900')}`}>
                          {recommendations[selectedMainService.id].display_text}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-light tracking-wide ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>{selectedMainService.description}</p>
                  </div>
                  <div className={`flex items-center gap-6 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 w-full md:w-auto mt-2 md:mt-0 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${isDark ? 'text-stone-400' : 'text-gray-500'}`} />
                      <span className={`text-sm font-bold ${isDark ? 'text-stone-300' : 'text-gray-700'}`}>{selectedMainService.duration} MIN</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ADD-ONS SECTION */}
              {selectedMainService && addOnServices.length > 0 && (
                <div className="animate-fadeIn mt-6">
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-4 ml-1 flex items-center gap-2 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
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
                            ? isDark ? 'bg-stone-700 border-white/20 shadow-md' : 'bg-gray-100 border-gray-400 shadow-md'
                            : isDark ? 'bg-stone-800 border-white/10 hover:border-white/20' : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'}
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                            ${selectedAddOns.includes(extra.id) ? (isDark ? 'bg-white border-white' : 'bg-gray-900 border-gray-900') : (isDark ? 'border-stone-500' : 'border-gray-300')}
                          `}>
                            {selectedAddOns.includes(extra.id) && <Check className={`w-3 h-3 ${isDark ? 'text-black' : 'text-white'}`} />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${selectedAddOns.includes(extra.id) ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-stone-200' : 'text-gray-700')}`}>
                              {extra.name}
                            </p>
                            <p className={`text-xs mt-0.5 font-light ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>{extra.description}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${isDark ? 'text-stone-300' : 'text-gray-700'}`}>₹{extra.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DATE & TIME SELECTION */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                    Preferred Date <span className={isDark ? 'text-white' : 'text-gray-900'}>*</span>
                  </label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-gray-900 dark:group-focus-within:text-white transition-colors pointer-events-none" />
                    <input
                      type="date"
                      name="booking_date"
                      value={formData.booking_date}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      min={todayStr}
                      className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none placeholder-gray-400 transition-all text-sm tracking-wide uppercase ${fieldErrors.booking_date && touched.booking_date ? (isDark ? 'border-red-500/50 bg-red-500/10' : 'border-red-300 bg-red-50') : (isDark ? 'bg-stone-800 border-white/10 text-white focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400')}`}
                      required
                    />
                  </div>
                  {fieldErrors.booking_date && touched.booking_date && <p className="text-red-500 text-xs font-light mt-1 ml-1">{fieldErrors.booking_date}</p>}
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                    Preferred Time <span className={isDark ? 'text-white' : 'text-gray-900'}>*</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {timeSlots.map((time) => {
                      const isBlocked = blockedTimes.includes(time);
                      const isSelected = formData.booking_time === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={isBlocked}
                          onClick={() => { setFormData({ ...formData, booking_time: time }); setFieldErrors(prev => ({ ...prev, booking_time: '' })); setTouched(prev => ({ ...prev, booking_time: true })); }}
                          className={`
                            py-3 text-sm font-medium rounded-lg border transition-all duration-200
                            ${isBlocked
                              ? isDark ? 'border-white/5 text-stone-600 bg-stone-800/50 cursor-not-allowed' : 'border-gray-200 text-gray-300 bg-gray-100 cursor-not-allowed'
                              : isSelected
                                ? isDark ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-gray-900 text-white border-gray-900 shadow-lg scale-105'
                                : isDark ? 'bg-stone-800 border-white/10 text-stone-300 hover:border-white/20 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 hover:bg-white'
                            }
                          `}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.booking_time && touched.booking_time && <p className="text-red-500 text-xs font-light mt-2 ml-1">{fieldErrors.booking_time}</p>}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                  Special Requests (Optional)
                </label>
                <div className="relative group">
                  <MessageSquare className={`absolute left-4 top-4 w-4 h-4 ${isDark ? 'text-stone-500' : 'text-gray-400'} group-focus-within:text-gray-900 transition-colors`} />
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="4"
                    className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none placeholder-gray-400 transition-all resize-none text-sm leading-relaxed ${isDark ? 'bg-stone-800 border-white/10 text-white focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400'}`}
                    placeholder="Any allergies or specific requirements?"
                  />
                </div>
              </div>

              {/* COUPON SECTION */}
              {selectedMainService && (
                <div className="mt-6 animate-fadeIn">
                  {couponEligible && !couponApplied && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3 cursor-pointer" onClick={() => { setShowCoupon(true); setCouponCode(couponEligible.code); }}>
                      <Gift className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800"><Gift className="w-4 h-4 inline mr-1" /> New here? Use code <span className="font-mono bg-amber-100 px-2 py-0.5 rounded text-amber-900">{couponEligible.code}</span> for {couponEligible.discount_percent}% off!</p>
                        <p className="text-xs text-amber-600 mt-0.5">Tap to apply automatically</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 cursor-pointer mb-3" onClick={() => setShowCoupon(!showCoupon)}>
                    <Tag className={`w-4 h-4 ${isDark ? 'text-stone-400' : 'text-gray-500'}`} />
                    <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>Have a Coupon Code?</span>
                  </div>

                  {showCoupon && (
                    <div className="flex gap-3 animate-fadeInUp">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="ENTER COUPON CODE"
                        disabled={!!couponApplied}
                        className={`flex-1 px-4 py-3 border rounded-xl focus:outline-none text-sm tracking-widest uppercase disabled:opacity-50 ${isDark ? 'bg-stone-800 border-white/10 text-white focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400'}`}
                      />
                      {couponApplied ? (
                        <button type="button" onClick={removeCoupon} className="px-6 py-3 border border-red-300 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Remove</button>
                      ) : (
                        <button type="button" onClick={handleApplyCoupon} disabled={couponLoading} className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>{couponLoading ? '...' : 'Apply'}</button>
                      )}
                    </div>
                  )}
                  {couponApplied && <p className="text-amber-500 text-xs mt-2 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {couponApplied.discount_percent}% discount applied!</p>}
                  {couponError && <p className="text-red-500 text-xs mt-2">{couponError}</p>}
                </div>
              )}
            </div>

            {/* PAYMENT BREAKDOWN & SUBMIT */}
            <div className={`hidden md:block mt-12 pt-8 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              {calculateTotal() > 0 && (
                <div className={`rounded-xl border p-6 mb-6 ${isDark ? 'bg-stone-800 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>Payment Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className={isDark ? 'text-stone-400' : 'text-gray-500'}>Service Total</span><span className={isDark ? 'text-white' : 'text-gray-900'}>₹{calculateTotal()}</span></div>
                    {selectedAddOns.length > 0 && <div className={`flex justify-between text-xs ${isDark ? 'text-stone-500' : 'text-gray-400'}`}><span>Includes {selectedAddOns.length} extra(s)</span></div>}
                    {couponApplied && <div className="flex justify-between text-amber-500 font-medium"><span>Discount ({couponApplied.code})</span><span>-₹{getDiscount()}</span></div>}
                    <div className={`border-t border-dashed pt-2 flex justify-between font-semibold ${isDark ? 'border-white/20' : 'border-gray-300'}`}><span className={isDark ? 'text-stone-300' : 'text-gray-700'}>Final Total</span><span className={isDark ? 'text-white' : 'text-gray-900'}>₹{getFinalTotal()}</span></div>
                    <div className={`border-t pt-3 mt-3 space-y-1 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      <div className="flex justify-between text-emerald-500"><span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Pay Now (50%)</span><span className="font-bold">₹{getAdvance()}</span></div>
                      <div className="flex justify-between text-amber-500"><span className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Pay After Service</span><span className="font-bold">₹{getRemaining()}</span></div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className={`px-10 py-5 rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                  {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>Processing Payment...</>) : (<>Pay ₹{getAdvance() > 0 ? getAdvance() : '---'} & Confirm<ArrowRight className="w-4 h-4" /></>)}
                </button>
              </div>
            </div>

            {/* MOBILE STICKY FOOTER */}
            <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
              <div className={`backdrop-blur-xl border p-5 rounded-2xl shadow-2xl ${isDark ? 'bg-stone-900/95 border-white/10' : 'bg-white/95 border-gray-200'}`}>
                {calculateTotal() > 0 && couponApplied && <p className="text-amber-500 text-[10px] font-bold mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {couponApplied.discount_percent}% OFF Applied</p>}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>Pay Now (50%)</p>
                    <div className="flex items-center gap-1">
                      <IndianRupee className={`w-4 h-4 ${isDark ? 'text-white' : 'text-gray-900'}`} />
                      <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{getAdvance() > 0 ? getAdvance() : '0'}</span>
                    </div>
                    {getRemaining() > 0 && <p className="text-[10px] text-amber-600">+ ₹{getRemaining()} after service</p>}
                  </div>
                  <button type="submit" disabled={loading} className={`flex-1 py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 ${isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}>
                    {loading ? 'Processing...' : 'Pay & Book'} <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div className={`mt-12 border rounded-xl p-8 shadow-sm animate-fadeInUp ${isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-gray-200'}`} style={{ animationDelay: '0.2s' }}>
          <h3 className={`font-bold mb-6 text-xs uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-stone-300' : 'text-gray-700'}`}>
            <CheckCircle className={`w-4 h-4 ${isDark ? 'text-white' : 'text-gray-900'}`} />
            Booking Policy
          </h3>
          <div className={`grid md:grid-cols-2 gap-4 text-xs font-light tracking-wide leading-relaxed ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>•</span>
              <span>A <strong>50% advance payment</strong> is required to confirm your booking. The remaining balance is due after service completion.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>•</span>
              <span>Please arrive 10 minutes prior to your scheduled time to complete any necessary consultation forms.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>•</span>
              <span>Cancellations must be made at least 24 hours in advance. Advance payments are non-refundable.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>•</span>
              <span>New customers can use coupon code <strong>WELCOME5</strong> for a 5% discount on their first booking!</span>
            </div>
          </div>
          <div className={`mt-6 pt-4 border-t text-center text-[11px] tracking-widest uppercase font-semibold ${isDark ? 'border-white/10 text-stone-500' : 'border-gray-200 text-gray-400'}`}>
            Service rankings updated daily based on real bookings
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
