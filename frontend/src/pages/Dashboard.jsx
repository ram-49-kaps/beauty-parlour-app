import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Globe from 'react-globe.gl';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboard, Users, Calendar, IndianRupee, Bell, Search,
  MapPin, Cloud, Sun, LogOut, CheckCircle, XCircle, MoreHorizontal,
  Wind, Droplets, Trash2, Edit2, Plus, Filter, Loader2, AlertTriangle,
  Clock, Download, RefreshCcw, Send
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { API_BASE_URL, getImageUrl } from '../config'; // Import Config

const Dashboard = () => {
  const navigate = useNavigate();
  const globeEl = useRef();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('overview'); // overview, bookings, services, gallery
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [stats, setStats] = useState({
    totalBookings: 0, pendingBookings: 0, confirmedBookings: 0, totalEarnings: 0, recentBookings: []
  });
  // 🌤 WEATHER STATE
  const [weather, setWeather] = useState({ temp: '--', wind: '--', code: 0, condition: 'Loading...' });

  const [bookings, setBookings] = useState([]);
  const [subscribers, setSubscribers] = useState([]); // ✅ Added Subscribers State
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]); // ✅ Added Gallery State
  const [chartData, setChartData] = useState([]);

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [bookingToDelete, setBookingToDelete] = useState(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // ✅ Added Upload Loading
  const [serviceFormData, setServiceFormData] = useState({ name: '', description: '', price: '', duration: '', image_url: '' });

  // --- API CALLS ---
  useEffect(() => {
    fetchData();
    fetchWeather(); // Call Real Weather
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 20.5937, lng: 78.9629, altitude: 2.5 });
    }
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // 🌤 FETCH REAL WEATHER (Surat)
  const fetchWeather = async () => {
    try {
      // Open-Meteo Free API (No Key Needed)
      const res = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=21.1702&longitude=72.8311&current_weather=true');
      const { temperature, windspeed, weathercode } = res.data.current_weather;

      // Simple code mapping
      let condition = "Clear Sky";
      if (weathercode > 3) condition = "Cloudy";
      if (weathercode > 50) condition = "Rainy";
      if (weathercode > 80) condition = "Stormy";

      setWeather({
        temp: Math.round(temperature),
        wind: Math.round(windspeed),
        code: weathercode,
        condition
      });
    } catch (e) {
      console.error("Weather error:", e);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/admin-login'); return; }

      const [statsRes, bookingsRes, servicesRes, galleryRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/bookings/stats`, getAuthHeader()),
        axios.get(`${API_BASE_URL}/bookings`, getAuthHeader()),
        axios.get(`${API_BASE_URL}/services`),
        axios.get(`${API_BASE_URL}/gallery`) // ✅ Fetch Gallery
      ]);

      setStats(statsRes.data);
      setBookings(bookingsRes.data);
      setServices(servicesRes.data);
      setGallery(galleryRes.data);

      // ✅ Fetch Subscribers
      try {
        const subscribersRes = await axios.get(`${API_BASE_URL}/users/subscribers`, getAuthHeader());
        setSubscribers(subscribersRes.data);
      } catch (err) {
        console.warn("Failed to fetch subscribers", err);
      }

      // 📊 CALCULATE REAL CHART DATA
      processChartData(bookingsRes.data);

      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/admin-login');
      }
      setLoading(false);
    }
  };

  // 🔄 MANUAL REFRESH FUNCTION
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    toast.success('Dashboard updated');
    setRefreshing(false);
  };

  // --- HANDLE LAUNCH NOTIFICATION ---
  const handleLaunchNotification = async () => {
    if (!window.confirm("⚠️ ARE YOU SURE? This will send 'WE ARE LIVE' emails to ALL subscribers.")) return;

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/auth/trigger-launch`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      toast.success(res.data.message);
    } catch (error) {
      toast.error("Failed to send launch emails");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 📊 PROCESS DATA FOR CHART
  const processChartData = (bookingsData) => {
    const last7Days = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      last7Days[dayName] = 0;
    }

    bookingsData.forEach(b => {
      if (b.status === 'confirmed' || b.status === 'completed') {
        const date = new Date(b.booking_date);
        const dayName = days[date.getDay()];
        if (last7Days[dayName] !== undefined) {
          last7Days[dayName] += parseFloat(b.total_amount || 0);
        }
      }
    });

    const formattedData = Object.keys(last7Days).map(day => ({
      name: day,
      revenue: last7Days[day]
    }));

    setChartData(formattedData);
  };

  // 📥 EXPORT TO CSV FUNCTION
  const exportToCSV = () => {
    if (bookings.length === 0) {
      toast.error("No data to export");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Client Name,Email,Service,Date,Time,Amount,Status\n";

    bookings.forEach(b => {
      const row = `${b.id},"${b.customer_name}","${b.customer_email}","${b.service_name}",${b.booking_date},${b.booking_time},${b.total_amount},${b.status}`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "flawless_bookings_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report downloaded successfully");
  };

  // ⚠️ RESET DATA FUNCTION
  const handleResetData = () => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-sm text-stone-800">
          ⚠️ <b>DANGER ZONE</b><br />
          This will delete ALL bookings and reset revenue to ₹0.
          <br /><br />
          This action <b>cannot</b> be undone.
        </p>
        <div className="flex gap-2 mt-1">
          <button
            className="bg-red-600 text-white text-xs font-bold py-2 px-4 rounded hover:bg-red-700 transition"
            onClick={async () => {
              toast.dismiss(t.id); // Close current toast
              try {
                await axios.delete(`${API_BASE_URL}/bookings/actions/reset-all`, getAuthHeader());
                toast.success("System Reset Successful. Revenue is ₹0.");
                fetchData();
              } catch (err) {
                toast.error("Failed to reset data");
              }
            }}
          >
            Yes, Wipe Everything
          </button>
          <button
            className="bg-stone-200 text-stone-700 text-xs font-bold py-2 px-4 rounded hover:bg-stone-300 transition"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 8000, style: { border: '1px solid #ef4444', padding: '16px', color: '#713200' }, icon: '🚨' });
  };

  // --- ACTIONS ---
  const handleStatusUpdate = async (bookingId, status) => {
    setProcessingId(bookingId);
    try {
      await axios.put(`${API_BASE_URL}/bookings/${bookingId}/status`,
        { status, rejection_reason: status === 'rejected' ? rejectionReason : null }, getAuthHeader());
      toast.success(`Booking ${status} successfully!`);
      fetchData();
      setSelectedBooking(null);
      setRejectionReason('');
    } catch (error) {
      toast.error('Failed to update status.');
    } finally {
      setProcessingId(null);
    }
  };

  const executeDeleteBooking = async () => {
    if (!bookingToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/bookings/${bookingToDelete.id}`, getAuthHeader());
      toast.success('Booking deleted');
      fetchData();
      setBookingToDelete(null);
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Saving...');
    try {
      if (editingService) {
        await axios.put(`${API_BASE_URL}/services/${editingService.id}`, serviceFormData, getAuthHeader());
        toast.success('Updated!', { id: toastId });
      } else {
        await axios.post(`${API_BASE_URL}/services`, serviceFormData, getAuthHeader());
        toast.success('Created!', { id: toastId });
      }
      setShowServiceModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed', { id: toastId });
    }
  };

  // ✅ HANDLE SERVICE IMAGE UPLOAD
  const handleServiceImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    const toastId = toast.loading('Uploading image...');
    setIsUploading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/services/upload`, formData, {
        headers: {
          ...getAuthHeader().headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      setServiceFormData({ ...serviceFormData, image_url: res.data.image_url });
      toast.success('Image Uploaded!', { id: toastId });
    } catch (err) {
      console.error("Upload Error Details:", err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || err.message || 'Upload failed';
      toast.error(`Error: ${errorMessage}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const executeDeleteService = async () => {
    if (!serviceToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/services/${serviceToDelete.id}`, getAuthHeader());
      fetchData();
      toast.success('Service deleted');
      setServiceToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete service');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- GALLERY HANDLERS ---
  const handleAddGalleryItem = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Adding to Gallery...');
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      category: formData.get('category'),
      image_url: formData.get('image_url'),
      type: formData.get('type')
    };

    try {
      await axios.post(`${API_BASE_URL}/gallery`, data, getAuthHeader());
      toast.success('Added!', { id: toastId });
      fetchData(); // Refresh
      e.target.reset(); // Clear form
    } catch (err) {
      console.error(err);
      toast.error('Failed to add item', { id: toastId });
    }
  };

  const handleDeleteGalleryItem = async (id) => {
    if (!window.confirm("Delete this gallery item?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/gallery/${id}`, getAuthHeader());
      toast.success('Deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // ✅ LOGOUT FUNCTION (Fixed to redirect to secret portal)
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // Clear user data too
    navigate('/secure-owner-portal-2026');
    toast.success("Logged out successfully");
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (booking.customer_name || '').toLowerCase().includes(searchLower) || (booking.service_name || '').toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'confirmed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-stone-800 text-stone-400';
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20">
      <Toaster position="top-center" />

      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg bg-white">
              <img src="/Gallery/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg md:text-xl font-light tracking-wide text-white">ADMIN<span className="font-bold text-white hidden sm:inline">PANEL</span></span>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            {/* 🔄 REFRESH BUTTON */}
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-all ${refreshing ? 'animate-spin' : ''}`}
              title="Refresh Data"
            >
              <RefreshCcw size={18} className="md:w-5 md:h-5" />
            </button>

            <div className="h-6 w-px bg-white/10"></div>

            {/* ⚠️ RESET DATA BUTTON */}
            <button
              onClick={handleResetData}
              className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
              title="Reset All Data (DANGER)"
            >
              <AlertTriangle size={16} /> <span className="hidden sm:inline">Reset Data</span>
            </button>

            <button onClick={handleLogout} className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-red-400 transition-colors">
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="pt-28 pb-12 px-6 max-w-[1600px] mx-auto space-y-8">

        {/* STATS & CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Stat Cards - Optimized for Mobile Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Card 1: Total */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-stone-900 border border-white/10 p-4 rounded-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-stone-500 text-[10px] font-bold uppercase tracking-wider">Bookings</p>
                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400"><LayoutDashboard size={14} /></div>
                  </div>
                  <h3 className="text-2xl md:text-3xl text-white font-light">{stats.totalBookings}</h3>
                </div>
              </motion.div>

              {/* Card 2: Pending */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-stone-900 border border-white/10 p-4 rounded-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-500/10 rounded-full blur-xl group-hover:bg-yellow-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-stone-500 text-[10px] font-bold uppercase tracking-wider">Pending</p>
                    <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-400"><Clock size={14} /></div>
                  </div>
                  <h3 className="text-2xl md:text-3xl text-white font-light">{stats.pendingBookings}</h3>
                </div>
              </motion.div>

              {/* Card 3: Confirmed */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-stone-900 border border-white/10 p-4 rounded-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-500/10 rounded-full blur-xl group-hover:bg-green-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-stone-500 text-[10px] font-bold uppercase tracking-wider">Confirmed</p>
                    <div className="p-1.5 rounded-md bg-green-500/10 text-green-400"><CheckCircle size={14} /></div>
                  </div>
                  <h3 className="text-2xl md:text-3xl text-white font-light">{stats.confirmedBookings}</h3>
                </div>
              </motion.div>

              {/* Card 4: Revenue */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-stone-900 border border-white/10 p-4 rounded-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-stone-500 text-[10px] font-bold uppercase tracking-wider">Revenue</p>
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400"><IndianRupee size={14} /></div>
                  </div>
                  <h3 className="text-2xl md:text-3xl text-white font-light">₹{stats.totalEarnings}</h3>
                </div>
              </motion.div>
            </div>

            {/* 📊 REAL DYNAMIC CHART */}
            <div className="bg-stone-900/30 border border-white/5 p-6 rounded-2xl h-[320px] relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">Weekly Revenue Analytics</h3>
                <button onClick={handleResetData} className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1 rounded border border-red-500/20 hover:bg-red-500 hover:text-white transition uppercase font-bold tracking-wider">
                  RESET DATA
                </button>
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fff" stopOpacity={0.1} /><stop offset="95%" stopColor="#fff" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} itemStyle={{ color: '#fff' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#fff" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-stone-900/50 border border-white/5 rounded-2xl overflow-hidden h-[220px] relative group">
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2"><MapPin size={10} /> Live Tracking</h3>
                <p className="text-white text-sm font-bold">Surat, India</p>
              </div>
              <Globe ref={globeEl} height={220} width={400} backgroundColor="rgba(0,0,0,0)" globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg" pointsData={[{ lat: 21.1702, lng: 72.8311, size: 1, color: 'white' }]} pointAltitude={0.1} pointColor="color" pointRadius={0.5} atmosphereColor="white" atmosphereAltitude={0.15} />
            </div>
            <div className="bg-gradient-to-br from-indigo-900/20 to-black border border-white/5 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-3xl" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <h3 className="text-4xl font-light text-white">{weather.temp}°C</h3>
                  <p className="text-indigo-200 text-xs mt-1 flex items-center gap-2">
                    <Cloud size={12} /> {weather.condition}
                  </p>
                </div>
                <Sun className="text-yellow-500 animate-spin-slow" size={32} />
              </div>
              <div className="mt-6 flex gap-6 text-xs text-stone-500">
                <div className="flex items-center gap-2"><Droplets size={12} /> <div><p>HUM</p><p className="text-white">--%</p></div></div>
                <div className="flex items-center gap-2"><Wind size={12} /> <div><p>WIND</p><p className="text-white">{weather.wind} km/h</p></div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-b border-white/10 pb-4">
          <button onClick={() => setActiveTab('bookings')} className={`pb-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'bookings' ? 'text-white border-b-2 border-white' : 'text-stone-500 hover:text-white'}`}>Bookings</button>
          {/* Services Tab */}
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'services' ? 'text-white border-b-2 border-white' : 'text-stone-500 hover:text-stone-300'}`}
          >
            Services
          </button>

          {/* Gallery Tab */}
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'gallery' ? 'text-white border-b-2 border-white' : 'text-stone-500 hover:text-stone-300'}`}
          >
            Gallery
          </button>

          {/* Subscribers Tab */}
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'subscribers' ? 'text-white border-b-2 border-white' : 'text-stone-500 hover:text-stone-300'}`}
          >
            Subscribers <span className="ml-1 bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded-full text-[10px]">{subscribers.length}</span>
          </button>
        </div>

        {/* BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 w-4 h-4 group-focus-within:text-white transition-colors" />
                <input type="text" placeholder="Search client or service..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-stone-900 border border-white/10 rounded-full py-3 pl-10 pr-4 text-sm text-white focus:border-white/40 outline-none transition-all" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                {/* 📥 EXPORT BUTTON */}
                <button
                  onClick={exportToCSV}
                  className="whitespace-nowrap flex items-center gap-2 bg-stone-900 border border-white/10 text-stone-400 hover:text-white hover:border-white/30 px-4 py-2 rounded-full text-xs font-bold uppercase transition-all"
                >
                  <Download size={14} /> Export CSV
                </button>

                <div className="relative min-w-[140px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 w-4 h-4" />
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-stone-900 border border-white/10 rounded-full pl-10 pr-6 py-2 text-sm text-white focus:border-white/40 outline-none appearance-none cursor-pointer">
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 🔹 MOBILE VIEW: COMPACT CARDS */}
            <div className="md:hidden space-y-3">
              {loading ? <div className="text-center text-stone-500 p-8">Loading...</div> :
                filteredBookings.length === 0 ? <div className="text-center text-stone-500 p-8">No bookings found.</div> :
                  filteredBookings.map((booking) => (
                    <div key={booking.id} className="bg-stone-900 border border-white/10 rounded-xl p-4 relative overflow-hidden">
                      {/* Top Row: Date & Status */}
                      <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                            {new Date(booking.booking_date).toLocaleDateString()} • {booking.booking_time}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>

                      {/* Middle: Client & Service */}
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center border border-white/10 text-white font-bold text-xs">
                            {booking.customer_name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white leading-tight">{booking.customer_name}</h4>
                            <p className="text-[10px] text-stone-500">{booking.service_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-sm font-light text-white">₹{booking.total_amount}</span>
                        </div>
                      </div>

                      {/* Bottom: Actions */}
                      <div className="flex gap-2">
                        {booking.status === 'pending' && (
                          <>
                            <button onClick={() => handleStatusUpdate(booking.id, 'confirmed')} className="flex-1 bg-green-900/20 text-green-400 border border-green-900/30 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-green-600 hover:text-white transition flex items-center justify-center gap-1">
                              <CheckCircle size={12} /> Accept
                            </button>
                            <button onClick={() => setSelectedBooking(booking)} className="flex-1 bg-red-900/20 text-red-400 border border-red-900/30 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-1">
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button onClick={() => handleStatusUpdate(booking.id, 'completed')} className="w-full bg-blue-900/20 text-blue-400 border border-blue-900/30 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-1">
                            <CheckCircle size={12} /> Mark Done
                          </button>
                        )}
                        {(booking.status === 'rejected' || booking.status === 'completed') && (
                          <button onClick={() => setBookingToDelete(booking)} className="w-full bg-stone-800 text-stone-400 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-1">
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              }
            </div>

            {/* 🔹 DESKTOP VIEW: TABLE */}
            <div className="hidden md:block bg-stone-900/30 border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/50 text-stone-500 text-xs uppercase tracking-widest">
                      <th className="p-4">Client</th>
                      <th className="p-4">Service</th>
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm text-stone-300">
                    {loading ? <tr><td colSpan="6" className="p-8 text-center text-stone-500">Loading...</td></tr> :
                      filteredBookings.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-stone-500">No bookings found.</td></tr> :
                        filteredBookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4"><div className="font-medium text-white">{booking.customer_name}</div><div className="text-xs text-stone-500">{booking.customer_email}</div></td>
                            <td className="p-4"><span className="text-white">{booking.service_name}</span></td>
                            <td className="p-4"><div className="flex gap-2"><span className="bg-stone-800 px-2 py-1 rounded text-xs">{new Date(booking.booking_date).toLocaleDateString()}</span><span className="text-stone-400">{booking.booking_time}</span></div></td>
                            <td className="p-4 font-bold text-white">₹{booking.total_amount || booking.price}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(booking.status)}`}>{booking.status}</span></td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {processingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin text-stone-500" /> : (
                                  <>
                                    {booking.status === 'pending' && (
                                      <>
                                        <button onClick={() => handleStatusUpdate(booking.id, 'confirmed')} className="text-green-400 hover:bg-green-500/10 p-2 rounded-lg" title="Confirm"><CheckCircle size={16} /></button>
                                        <button onClick={() => setSelectedBooking(booking)} className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg" title="Reject"><XCircle size={16} /></button>
                                      </>
                                    )}
                                    {booking.status === 'confirmed' && (
                                      <button onClick={() => handleStatusUpdate(booking.id, 'completed')} className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500 hover:text-white text-[10px] uppercase font-bold">Done</button>
                                    )}
                                    {(booking.status === 'rejected' || booking.status === 'completed') && (
                                      <button onClick={() => setBookingToDelete(booking)} className="text-stone-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-end mb-6">
              <button onClick={() => { setEditingService(null); setServiceFormData({ name: '', description: '', price: '', duration: '', image_url: '' }); setShowServiceModal(true); }} className="flex items-center gap-2 bg-white text-black px-6 py-3 md:py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition shadow-lg w-full md:w-auto justify-center">
                <Plus className="w-4 h-4" /> Add Service
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
                <div key={service.id} className="bg-stone-900/50 border border-white/10 rounded-2xl overflow-hidden group hover:border-white/20 transition-all">
                  <div className="h-48 overflow-hidden relative">
                    <img src={getImageUrl(service.image_url)} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-80 group-hover:opacity-100" />
                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">₹{service.price}</div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-white mb-2">{service.name}</h3>
                    <p className="text-stone-400 text-sm mb-4 line-clamp-2 h-10">{service.description}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{service.duration} Mins</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingService(service); setServiceFormData(service); setShowServiceModal(true); }} className="p-2 hover:bg-white/10 rounded-lg text-stone-400 hover:text-white transition"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setServiceToDelete(service)} className="p-2 hover:bg-red-500/10 rounded-lg text-stone-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Add Gallery Item Form */}
            <div className="bg-stone-900/50 border border-white/10 rounded-2xl p-6 mb-8">
              <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-4">Add New Item</h3>
              <form onSubmit={handleAddGalleryItem} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-2">
                  <input type="text" name="title" placeholder="Title (e.g. Bridal Look)" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-white/30 outline-none" required />
                </div>
                <div className="flex-1 w-full space-y-2">
                  <input type="text" name="category" placeholder="Category (e.g. Makeup)" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-white/30 outline-none" required />
                </div>
                <div className="flex-1 w-full space-y-2">
                  <input type="text" name="image_url" placeholder="Image URL (https://...)" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-white/30 outline-none" required />
                </div>
                <div className="w-full md:w-auto space-y-2">
                  <select name="type" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-white/30 outline-none cursor-pointer">
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <button type="submit" className="w-full md:w-auto bg-white text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition">
                  Upload
                </button>
              </form>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {gallery.map(item => (
                <div key={item.id} className="relative group bg-stone-900 border border-white/10 rounded-2xl overflow-hidden aspect-square">
                  {item.type === 'video' ? (
                    <video src={getImageUrl(item.image_url)} className="w-full h-full object-cover opacity-80" muted />
                  ) : (
                    <img src={getImageUrl(item.image_url)} alt={item.title} className="w-full h-full object-cover opacity-80" />
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-xs font-bold text-white uppercase tracking-widest">{item.category}</span>
                    <h4 className="text-sm font-light text-stone-300 mb-4">{item.title}</h4>
                    <button
                      onClick={() => handleDeleteGalleryItem(item.id)}
                      className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {gallery.length === 0 && (
              <div className="text-center py-20 text-stone-500">
                <p>Gallery is empty. Add a new item above.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* SUBSCRIBERS TAB */}
        {activeTab === 'subscribers' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-light text-white">Launch Notification List</h3>
              {subscribers.length > 0 && (
                <button
                  onClick={handleLaunchNotification}
                  disabled={loading}
                  className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-amber-900/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Launch & Notify All</>}
                </button>
              )}
            </div>

            {subscribers.length === 0 ? (
              <div className="bg-stone-900/30 border border-white/5 rounded-2xl p-12 text-center text-stone-500">
                <p>No subscribers yet. Share your launch page!</p>
              </div>
            ) : (
              <div className="bg-stone-900/30 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/50 text-stone-500 text-xs uppercase tracking-widest">
                      <th className="p-4">Email</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm text-stone-300">
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-white font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-[10px] font-bold text-stone-400">
                              {sub.email.charAt(0).toUpperCase()}
                            </div>
                            {sub.email}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            Subscribed
                          </span>
                        </td>
                        <td className="p-4 text-stone-500 text-xs">
                          {new Date(sub.created_at || Date.now()).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

      </main>

      {/* MODALS */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-light text-white mb-4">Reject Booking</h3>
            <textarea className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm mb-6 focus:border-white/30 outline-none" rows="3" placeholder="Reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}></textarea>
            <div className="flex gap-3">
              <button onClick={() => setSelectedBooking(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase">Cancel</button>
              <button onClick={() => handleStatusUpdate(selectedBooking.id, 'rejected')} disabled={processingId === selectedBooking.id} className="flex-1 py-3 rounded-xl bg-red-600/20 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white text-xs font-bold uppercase flex justify-center items-center gap-2">{processingId === selectedBooking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
      {bookingToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="w-8 h-8 text-red-500" /></div>
            <h3 className="text-xl font-light text-white mb-2">Delete Booking?</h3>
            <p className="text-stone-400 text-sm mb-8">Permanently delete booking for <strong>{bookingToDelete.customer_name}</strong>?<br />This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setBookingToDelete(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase">Cancel</button>
              <button onClick={executeDeleteBooking} disabled={isDeleting} className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase flex justify-center items-center gap-2">{isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-light text-white mb-6">{editingService ? 'Edit Service' : 'Add New Service'}</h3>
            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Name</label><input required type="text" value={serviceFormData.name} onChange={e => setServiceFormData({ ...serviceFormData, name: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-white/30" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Price</label><input required type="number" value={serviceFormData.price} onChange={e => setServiceFormData({ ...serviceFormData, price: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-white/30" /></div>
                <div><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Duration</label><input required type="number" value={serviceFormData.duration} onChange={e => setServiceFormData({ ...serviceFormData, duration: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-white/30" /></div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Service Image</label>
                <div className="flex flex-col gap-3">
                  {/* Preview Section */}
                  <div className="flex gap-4 items-center p-3 bg-black/30 border border-white/5 rounded-xl">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-stone-800 flex-shrink-0">
                      <img src={getImageUrl(serviceFormData.image_url)} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-stone-500 truncate mb-1">{serviceFormData.image_url || 'No image selected'}</p>
                      <input
                        type="file"
                        onChange={handleServiceImageUpload}
                        className="hidden"
                        id="service-image-upload"
                        accept="image/*"
                      />
                      <label
                        htmlFor="service-image-upload"
                        className={`inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        {serviceFormData.image_url ? 'Change Image' : 'Upload Image'}
                      </label>
                    </div>
                  </div>

                  {/* Manual URL Input (Optional) */}
                  <div className="flex flex-col">
                    <span className="text-[9px] text-stone-600 uppercase mb-1">Or provide direct URL</span>
                    <input
                      type="text"
                      placeholder="/Gallery/file.jpg or https://..."
                      value={serviceFormData.image_url}
                      onChange={e => setServiceFormData({ ...serviceFormData, image_url: e.target.value })}
                      className="w-full bg-black/10 border border-white/5 rounded-lg p-2 text-xs text-stone-400 outline-none focus:border-white/20"
                    />
                  </div>
                </div>
              </div>

              <div><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Description</label><textarea required rows="3" value={serviceFormData.description} onChange={e => setServiceFormData({ ...serviceFormData, description: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-white/30"></textarea></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowServiceModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-white text-black hover:bg-stone-200 text-xs font-bold uppercase">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {serviceToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
            <h3 className="text-xl font-light text-white mb-2">Delete Service?</h3>
            <p className="text-stone-400 text-sm mb-8">Are you sure you want to delete <strong>{serviceToDelete.name}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setServiceToDelete(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase">Cancel</button>
              <button onClick={executeDeleteService} disabled={isDeleting} className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase flex justify-center items-center gap-2">{isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;