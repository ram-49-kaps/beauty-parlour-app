import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
console.log('🔌 API Base URL:', API_URL); // Debugging: Check where requests are going

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- AUTH APIS ---
export const login = (credentials) => api.post('/auth/login', credentials);
export const googleLogin = (token) => api.post('/auth/google', { access_token: token });
export const register = (userData) => api.post('/auth/register', userData);

// --- USER PROFILE APIS ---
// Note: Usually updates are PUT, but if your backend uses POST for image upload, keep it. 
// I changed it to PUT based on standard practices, but if it fails, change back to POST.
export const uploadProfileImage = (formData) => api.put('/users/profile-image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const deleteProfileImage = () => api.delete('/users/profile-image');

// --- BOOKING APIS (Fixed 404 Errors) ---
export const getServices = () => api.get('/services');
export const createBooking = (bookingData) => api.post('/bookings', bookingData);

// ✅ FIX 1: Added '/bookings' prefix (matches server.js + bookingRoutes.js)
export const getUserBookings = () => api.get('/bookings/my-bookings');

// ✅ FIX 2: Changed PATCH to PUT and fixed path
export const rescheduleBooking = (id, date, time) =>
  api.put(`/bookings/${id}/reschedule`, { booking_date: date, booking_time: time });

// --- ADMIN DASHBOARD APIS ---
export const getBookings = () => api.get('/bookings');

// ✅ FIX 3: Changed PATCH to PUT (Backend uses router.put)
export const updateBookingStatus = (id, status, rejection_reason) =>
  api.put(`/bookings/${id}/status`, { status, rejection_reason });

// ✅ FIX 4: Corrected path to match bookingRoutes.js (/stats is inside /bookings)
export const getDashboardStats = () => api.get('/bookings/stats');

// --- ADMIN SERVICE MANAGEMENT ---
export const createService = (serviceData) => api.post('/services', serviceData);
export const updateService = (id, serviceData) => api.put(`/services/${id}`, serviceData);
export const deleteService = (id) => api.delete(`/services/${id}`);

export default api;