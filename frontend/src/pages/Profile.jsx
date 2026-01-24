import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Clock, Edit2, LogOut, Camera, CheckCircle, X, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserBookings, uploadProfileImage, deleteProfileImage, rescheduleBooking } from '../services/api';

const Profile = () => {
  // 1. GET 'loading' FROM CONTEXT (renamed to authLoading)
  // This prevents the "redirect on refresh" bug
  const { user, logout, setUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state for fetching bookings

  // UI States
  const [showLogoutAnimation, setShowLogoutAnimation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Reschedule Modal States
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // --- TOAST NOTIFICATION STATE ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Helper: Show Notification
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // 2. SAFE REDIRECT: Only redirect if Auth is done loading AND no user exists
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Fetch Bookings Function
  const fetchBookings = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await getUserBookings();
      setBookings(response.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      showNotification("Failed to load appointments.", 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings when user is ready
  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  // --- HANDLERS ---

  const handleLogout = () => {
    setShowLogoutAnimation(true);
    setTimeout(() => {
      logout();
      navigate('/'); // Redirect to Home
    }, 3000);
  };

  const handleImageClick = () => { fileInputRef.current.click(); };

  // Upload Image
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification("File size too large (Max 5MB)", 'error');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploading(true);
      const response = await uploadProfileImage(formData);

      // Update Context & Local Storage
      const updatedUser = { ...user, profile_image: response.data.profile_image };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      showNotification("Profile picture updated!");

    } catch (err) {
      console.error("Upload failed", err);
      showNotification("Failed to upload image.", 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteModal(true); };

  // Delete Image
  const confirmDeleteImage = async () => {
    try {
      setUploading(true);
      await deleteProfileImage();

      const updatedUser = { ...user, profile_image: null };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setShowDeleteModal(false);
      // RED Toast for removal
      showNotification("Profile picture removed.", 'error');

    } catch (err) {
      console.error("Remove failed", err);
      showNotification("Failed to remove image.", 'error');
    } finally {
      setUploading(false);
    }
  };

  // Reschedule Setup
  const handleRescheduleClick = (booking) => {
    setSelectedBooking(booking);
    const dateObj = new Date(booking.date);
    const dateStr = dateObj.toISOString().split('T')[0];
    setNewDate(dateStr);
    setNewTime(booking.time.slice(0, 5));
    setShowRescheduleModal(true);
  };

  // Reschedule Submit
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) return;

    try {
      setRescheduleLoading(true);
      await rescheduleBooking(selectedBooking.id, newDate, newTime);

      setShowRescheduleModal(false);
      await fetchBookings();

      showNotification("Appointment rescheduled successfully!");

    } catch (err) {
      console.error("Reschedule failed", err);
      showNotification("Failed to reschedule. Please try again.", 'error');
    } finally {
      setRescheduleLoading(false);
    }
  };

  // --- HELPERS ---

  const timeSlots = [];
  for (let hour = 9; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break;
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'pending': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'completed': return 'bg-stone-700/50 text-stone-400 border-stone-600';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-stone-800 text-stone-400';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // 3. SHOW LOADING SCREEN WHILE AUTH CHECKS LOCAL STORAGE
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-white pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto">

        {/* PROFILE HEADER */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-16 animate-fadeInUp">
          <div className="relative group w-32 h-32">
            <div className="w-full h-full rounded-full bg-stone-800 border-2 border-white/10 overflow-hidden flex items-center justify-center relative">
              {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div></div>}
              {user.profile_image ? (
                <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = ''; }} />
              ) : (
                <span className="text-4xl font-light text-stone-500">{user.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <button onClick={handleImageClick} disabled={uploading} className="absolute bottom-0 right-0 p-2.5 bg-white text-black rounded-full hover:bg-stone-200 transition-all shadow-lg hover:scale-110 z-20 cursor-pointer"><Camera className="w-4 h-4" /></button>
            {user.profile_image && !uploading && (
              <button onClick={handleDeleteClick} className="absolute -top-1 -right-1 p-2 bg-red-600 text-white rounded-full hover:bg-red-500 transition-all shadow-xl z-50 cursor-pointer border-2 border-stone-950"><X className="w-3 h-3" /></button>
            )}
          </div>

          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-light mb-2">{user.name}</h1>
            <p className="text-stone-500 uppercase tracking-widest text-xs mb-4">Member since {new Date(user.created_at || Date.now()).getFullYear()}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2 text-sm text-stone-400"><Mail className="w-4 h-4" />{user.email}</div>
              {user.phone && <div className="flex items-center gap-2 text-sm text-stone-400"><Phone className="w-4 h-4" />{user.phone}</div>}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-white/10 mb-10">
          <button onClick={() => setActiveTab('bookings')} className={`px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'bookings' ? 'border-white text-white' : 'border-transparent text-stone-500 hover:text-stone-300'}`}>My Appointments</button>
          <button onClick={() => setActiveTab('settings')} className={`px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'settings' ? 'border-white text-white' : 'border-transparent text-stone-500 hover:text-stone-300'}`}>Settings</button>
        </div>

        {/* CONTENT */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>

          {/* BOOKINGS LIST */}
          {activeTab === 'bookings' && (
            <div className="grid gap-6">
              {loading ? (
                <div className="text-center py-20"><div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div><p className="text-stone-500 text-sm tracking-widest uppercase">Loading appointments...</p></div>
              ) : bookings.length > 0 ? (
                bookings.map((booking) => (
                  <div key={booking.id} className="bg-stone-900/50 border border-white/5 rounded-xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-white/10 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {/* 4. UPDATED: ID number removed */}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(booking.status)}`}>{booking.status}</span>
                      </div>
                      <h3 className="text-xl font-light text-white mb-2">{booking.service_name || 'Service Name'}</h3>
                      <div className="flex items-center gap-6 text-stone-400 text-sm">
                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{formatDate(booking.date)}</div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{booking.time?.slice(0, 5)}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                      <span className="text-2xl font-light text-white">₹{booking.price}</span>
                      {(booking.status?.toLowerCase() === 'pending' || booking.status?.toLowerCase() === 'confirmed') && (
                        <button
                          onClick={() => handleRescheduleClick(booking)}
                          className="w-full md:w-auto px-6 py-2 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl"><p className="text-stone-500 mb-4">No appointments found</p><button onClick={() => navigate('/booking')} className="px-8 py-3 bg-white text-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-stone-200 transition-all">Book A Service</button></div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl"><div className="bg-stone-900/50 border border-white/5 rounded-xl p-8 space-y-8"><div><h3 className="text-lg font-light text-white mb-6">Account Details</h3><div className="space-y-4"><div className="p-4 bg-stone-950 rounded-lg border border-white/5 flex justify-between items-center"><div><label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Full Name</label><p className="text-white">{user.name}</p></div></div><div className="p-4 bg-stone-950 rounded-lg border border-white/5 flex justify-between items-center"><div><label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Email Address</label><p className="text-white">{user.email}</p></div></div></div></div><div className="pt-8 border-t border-white/5"><button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-widest"><LogOut className="w-4 h-4" />Sign Out of Account</button></div></div></div>
          )}
        </div>

        {/* --- MODALS --- */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-stone-900 border border-white/10 p-8 max-w-sm w-full mx-6 shadow-2xl animate-fadeInUp">
              <div className="text-center">
                <div className="w-16 h-16 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 bg-stone-800"><Trash2 className="w-6 h-6 text-red-400" /></div>
                <h3 className="text-xl text-white font-light tracking-widest uppercase mb-2">Delete Photo?</h3>
                <p className="text-stone-400 text-sm mb-8 font-light">Are you sure you want to remove your profile picture?</p>
                <div className="flex gap-4">
                  <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-6 py-3 border border-white/20 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors">Cancel</button>
                  <button onClick={confirmDeleteImage} className="flex-1 px-6 py-3 bg-red-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all">Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRescheduleModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-stone-900 border border-white/10 p-8 max-w-md w-full mx-6 shadow-2xl animate-fadeInUp">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl text-white font-light tracking-widest uppercase">Reschedule</h3>
                <button onClick={() => setShowRescheduleModal(false)} className="text-stone-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="mb-6 bg-stone-950 p-4 rounded-lg border border-white/5">
                <p className="text-stone-500 text-xs uppercase tracking-widest mb-1">Service</p>
                <p className="text-white text-sm font-semibold">{selectedBooking?.service_name}</p>
              </div>
              <form onSubmit={handleRescheduleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">New Date</label>
                  <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-stone-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 text-sm uppercase tracking-wider" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">New Time</label>
                  <select required value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full p-4 bg-stone-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 text-sm tracking-wider appearance-none">
                    <option value="">Select Time Slot</option>
                    {timeSlots.map((time) => (<option key={time} value={time}>{time}</option>))}
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowRescheduleModal(false)} className="flex-1 py-4 border border-white/20 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors rounded-lg">Cancel</button>
                  <button type="submit" disabled={rescheduleLoading} className="flex-1 py-4 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-stone-200 transition-all rounded-lg disabled:opacity-50">{rescheduleLoading ? 'Updating...' : 'Confirm'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- TOAST NOTIFICATION --- */}
        {toast.show && (
          <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-fadeInUp">
            <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-md ${toast.type === 'error'
                ? 'bg-red-900/90 border-red-500/30 text-white'
                : 'bg-emerald-900/90 border-emerald-500/30 text-white'
              }`}>
              {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
              <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
            </div>
          </div>
        )}

        {/* LOGOUT ANIMATION */}
        {showLogoutAnimation && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-stone-950 text-white">
            <div className="absolute inset-0 overflow-hidden"><div className="absolute top-20 left-10 w-96 h-96 bg-stone-800 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float"></div><div className="absolute bottom-40 right-10 w-96 h-96 bg-stone-700 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" style={{ animationDelay: '2s' }}></div></div>
            <div className="text-center relative z-10"><div className="animate-fadeInUp space-y-4"><h2 className="text-4xl md:text-5xl font-light tracking-tight text-white">See you soon, <span className="font-semibold text-stone-300">{user?.name}</span></h2><div className="mt-6 inline-flex items-center gap-2 border border-white/20 text-white px-8 py-3 rounded-full"><CheckCircle className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-widest">Logged Out</span></div></div></div>
          </div>
        )}
      </div>
      <style>{`@keyframes petalBloom {0% { transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(0) scale(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(-60px) scale(1); opacity: 1; }} .animate-fadeInUp { animation: fadeInUp 1s ease-out 0.8s both; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } } @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } } .animate-float { animation: float 6s ease-in-out infinite; }`}</style>
    </div>
  );
};

export default Profile;