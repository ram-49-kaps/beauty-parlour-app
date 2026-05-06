import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Clock, Edit2, LogOut, Camera, CheckCircle, X, Trash2, AlertCircle, FileDown, IndianRupee, Tag } from 'lucide-react';
import { generateReceipt } from '../utils/receiptGenerator';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getUserBookings, uploadProfileImage, deleteProfileImage, rescheduleBooking } from '../services/api';

const Profile = () => {
  const { user, logout, setUser, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showLogoutAnimation, setShowLogoutAnimation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

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

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const handleLogout = () => {
    setShowLogoutAnimation(true);
    setTimeout(() => {
      logout();
      navigate('/');
    }, 3000);
  };

  const handleImageClick = () => { fileInputRef.current.click(); };

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

  const confirmDeleteImage = async () => {
    try {
      setUploading(true);
      await deleteProfileImage();
      const updatedUser = { ...user, profile_image: null };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setShowDeleteModal(false);
      showNotification("Profile picture removed.", 'error');
    } catch (err) {
      console.error("Remove failed", err);
      showNotification("Failed to remove image.", 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRescheduleClick = (booking) => {
    setSelectedBooking(booking);
    const dateObj = new Date(booking.date);
    const dateStr = dateObj.toISOString().split('T')[0];
    setNewDate(dateStr);
    setNewTime(booking.time.slice(0, 5));
    setShowRescheduleModal(true);
  };

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
      case 'confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'completed': return 'bg-gray-100 text-gray-500 border-gray-300';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-stone-950 text-white' : 'bg-gray-50 text-gray-900'} pt-24 pb-12 px-6`}>
      <div className="max-w-6xl mx-auto">

        {/* PROFILE HEADER */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-16 animate-fadeInUp">
          <div className="relative group w-32 h-32">
            <div className={`w-full h-full rounded-full border-2 overflow-hidden flex items-center justify-center relative ${isDark ? 'bg-stone-800 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
              {uploading && <div className={`absolute inset-0 flex items-center justify-center z-10 ${isDark ? 'bg-black/50' : 'bg-white/50'}`}><div className={`w-6 h-6 border-2 rounded-full animate-spin ${isDark ? 'border-white/20 border-t-white' : 'border-gray-300 border-t-gray-800'}`}></div></div>}
              {user.profile_image ? (
                <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = ''; }} />
              ) : (
                <span className={`text-4xl font-light ${isDark ? 'text-stone-400' : 'text-gray-400'}`}>{user.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <button onClick={handleImageClick} disabled={uploading} className="absolute bottom-0 right-0 p-2.5 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg hover:scale-110 z-20 cursor-pointer"><Camera className="w-4 h-4" /></button>
            {user.profile_image && !uploading && (
              <button onClick={handleDeleteClick} className="absolute -top-1 -right-1 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-xl z-50 cursor-pointer border-2 border-white"><X className="w-3 h-3" /></button>
            )}
          </div>

          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-light mb-2">{user.name}</h1>
            <p className={`uppercase tracking-widest text-xs mb-4 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Member since {new Date(user.created_at || Date.now()).getFullYear()}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-stone-400' : 'text-gray-500'}`}><Mail className="w-4 h-4" />{user.email}</div>
              {user.phone && <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-stone-400' : 'text-gray-500'}`}><Phone className="w-4 h-4" />{user.phone}</div>}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className={`flex border-b mb-10 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <button onClick={() => setActiveTab('bookings')} className={`px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'bookings' ? (isDark ? 'border-white text-white' : 'border-gray-900 text-gray-900') : (isDark ? 'border-transparent text-stone-500 hover:text-stone-300' : 'border-transparent text-gray-400 hover:text-gray-600')}`}>My Appointments</button>
          <button onClick={() => setActiveTab('settings')} className={`px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'settings' ? (isDark ? 'border-white text-white' : 'border-gray-900 text-gray-900') : (isDark ? 'border-transparent text-stone-500 hover:text-stone-300' : 'border-transparent text-gray-400 hover:text-gray-600')}`}>Settings</button>
        </div>

        {/* CONTENT */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>

          {activeTab === 'bookings' && (
            <div className="grid gap-6">
              {loading ? (
                <div className="text-center py-20"><div className="w-12 h-12 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-500 text-sm tracking-widest uppercase">Loading appointments...</p></div>
              ) : bookings.length > 0 ? (
                bookings.map((booking) => (
                  <div key={booking.id} className={`border rounded-xl ${isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-gray-200'} p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-gray-300 transition-colors shadow-sm`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(booking.status)}`}>{booking.status}</span>
                        {booking.payment_status && (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${booking.payment_status === 'fully_paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : booking.payment_status === 'advance_paid' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            <IndianRupee className="w-3 h-3 inline" /> {booking.payment_status === 'fully_paid' ? 'Fully Paid' : booking.payment_status === 'advance_paid' ? 'Advance Paid' : 'Unpaid'}
                          </span>
                        )}
                        {booking.coupon_code && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200"><Tag className="w-3 h-3 inline" /> {booking.coupon_code}</span>
                        )}
                      </div>
                      <h3 className={`text-xl font-light mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{booking.service_name || 'Service Name'}</h3>
                      <div className="flex items-center gap-6 text-gray-500 text-sm">
                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{formatDate(booking.date)}</div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{booking.time?.slice(0, 5)}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                      <span className={`text-2xl font-light ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{booking.total_amount || booking.price}</span>
                      {booking.advance_amount > 0 && (
                        <div className="text-right text-xs space-y-0.5">
                          {booking.discount_amount > 0 && <p className="text-purple-600">Discount: -₹{booking.discount_amount}</p>}
                          <p className="text-emerald-600">Paid: ₹{booking.advance_amount}</p>
                          {booking.remaining_amount > 0 && <p className="text-amber-600">Due: ₹{booking.remaining_amount}</p>}
                        </div>
                      )}
                      <div className="flex gap-2 w-full md:w-auto">
                        {(booking.status?.toLowerCase() === 'pending' || booking.status?.toLowerCase() === 'confirmed') && (
                          <button
                            onClick={() => handleRescheduleClick(booking)}
                            className={`flex-1 md:flex-none px-5 py-2 border rounded-full text-xs font-bold uppercase tracking-widest transition-all ${isDark ? 'border-white/10 text-white hover:bg-white hover:text-black' : 'border-gray-300 hover:bg-gray-900 hover:text-white'}`}
                          >
                            Reschedule
                          </button>
                        )}
                        {booking.razorpay_payment_id && (
                          <button
                            onClick={() => generateReceipt(booking)}
                            className={`flex-1 md:flex-none px-5 py-2 border rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${isDark ? 'border-white/10 text-white hover:bg-white hover:text-black' : 'border-gray-300 hover:bg-gray-900 hover:text-white'}`}
                          >
                            <FileDown className="w-3 h-3" /> Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`text-center py-20 border border-dashed rounded-2xl ${isDark ? 'border-white/10' : 'border-gray-300'}`}><p className={`mb-4 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>No appointments found</p><button onClick={() => navigate('/booking')} className="px-8 py-3 bg-black text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all">Book A Service</button></div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl"><div className={`border rounded-xl ${isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-gray-200'} p-8 space-y-8 shadow-sm`}><div><h3 className={`text-lg font-light mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Account Details</h3><div className="space-y-4"><div className={`p-4 rounded-lg border flex justify-between items-center ${isDark ? 'bg-stone-800 border-white/5' : 'bg-gray-50 border-gray-200'}`}><div><label className={`block text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Full Name</label><p className={isDark ? 'text-white' : 'text-gray-900'}>{user.name}</p></div></div><div className={`p-4 rounded-lg border flex justify-between items-center ${isDark ? 'bg-stone-800 border-white/5' : 'bg-gray-50 border-gray-200'}`}><div><label className={`block text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-stone-500' : 'text-gray-500'}`}>Email Address</label><p className={isDark ? 'text-white' : 'text-gray-900'}>{user.email}</p></div></div></div></div><div className={`pt-8 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}><button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors text-xs font-bold uppercase tracking-widest"><LogOut className="w-4 h-4" />Sign Out of Account</button></div></div></div>
          )}
        </div>

        {/* --- MODALS --- */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className={`${isDark ? 'bg-black border-white/10' : 'bg-white border-gray-200'} border p-8 max-w-sm w-full mx-6 shadow-2xl animate-fadeInUp rounded-2xl`}>
              <div className="text-center">
                <div className={`w-16 h-16 ${isDark ? 'border-white/10 bg-black' : 'border-gray-200 bg-gray-50'} border rounded-full flex items-center justify-center mx-auto mb-6`}><Trash2 className="w-6 h-6 text-red-500" /></div>
                <h3 className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'} font-light tracking-widest uppercase mb-2`}>Delete Photo?</h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm mb-8 font-light`}>Are you sure you want to remove your profile picture?</p>
                <div className="flex gap-4">
                  <button onClick={() => setShowDeleteModal(false)} className={`flex-1 px-6 py-3 border text-xs font-bold uppercase tracking-widest transition-colors rounded-lg ${isDark ? 'border-white/10 text-gray-200 hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
                  <button onClick={confirmDeleteImage} className="flex-1 px-6 py-3 bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all rounded-lg">Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRescheduleModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className={`${isDark ? 'bg-black border-white/10' : 'bg-white border-gray-200'} border p-8 max-w-md w-full mx-6 shadow-2xl animate-fadeInUp rounded-2xl`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'} font-light tracking-widest uppercase`}>Reschedule</h3>
                <button onClick={() => setShowRescheduleModal(false)} className={`${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-900'}`}><X className="w-5 h-5" /></button>
              </div>
              <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs uppercase tracking-widest mb-1`}>Service</p>
                <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-sm font-semibold`}>{selectedBooking?.service_name}</p>
              </div>
              <form onSubmit={handleRescheduleSubmit} className="space-y-6">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-widest mb-2`}>New Date</label>
                  <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className={`w-full p-4 rounded-lg focus:outline-none text-sm uppercase tracking-wider border ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-white/20' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-widest mb-2`}>New Time</label>
                  <select required value={newTime} onChange={(e) => setNewTime(e.target.value)} className={`w-full p-4 rounded-lg focus:outline-none text-sm tracking-wider appearance-none border ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-white/20' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400'}`}>
                    <option value="">Select Time Slot</option>
                    {timeSlots.map((time) => (<option key={time} value={time}>{time}</option>))}
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowRescheduleModal(false)} className={`flex-1 py-4 border text-xs font-bold uppercase tracking-widest transition-colors rounded-lg ${isDark ? 'border-white/10 text-gray-200 hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
                  <button type="submit" disabled={rescheduleLoading} className={`flex-1 py-4 text-white text-xs font-bold uppercase tracking-widest transition-all rounded-lg disabled:opacity-50 ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-900 hover:bg-gray-800'}`}>{rescheduleLoading ? 'Updating...' : 'Confirm'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- TOAST NOTIFICATION --- */}
        {toast.show && (
          <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-fadeInUp">
            <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-md ${toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
              {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
              <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
            </div>
          </div>
        )}

        {/* LOGOUT ANIMATION */}
        {showLogoutAnimation && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white text-gray-900">
            <div className="absolute inset-0 overflow-hidden"><div className="absolute top-20 left-10 w-96 h-96 bg-rose-100 rounded-full filter blur-[100px] opacity-30 animate-float"></div><div className="absolute bottom-40 right-10 w-96 h-96 bg-purple-100 rounded-full filter blur-[100px] opacity-30 animate-float" style={{ animationDelay: '2s' }}></div></div>
            <div className="text-center relative z-10"><div className="animate-fadeInUp space-y-4"><h2 className="text-4xl md:text-5xl font-light tracking-tight text-gray-900">See you soon, <span className="font-semibold text-gray-600">{user?.name}</span></h2><div className="mt-6 inline-flex items-center gap-2 border border-gray-300 text-gray-900 px-8 py-3 rounded-full"><CheckCircle className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-widest">Logged Out</span></div></div></div>
          </div>
        )}
      </div>
      <style>{`@keyframes petalBloom {0% { transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(0) scale(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(-60px) scale(1); opacity: 1; }} .animate-fadeInUp { animation: fadeInUp 1s ease-out 0.8s both; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } } @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } } .animate-float { animation: float 6s ease-in-out infinite; }`}</style>
    </div>
  );
};

export default Profile;