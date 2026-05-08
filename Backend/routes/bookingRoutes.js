import express from 'express';
import {
    createBooking,
    createPaymentOrder,
    verifyPaymentAndBook,
    getAllBookings,
    getBookedSlots,
    getUserBookings,
    updateBookingStatus,
    updatePaymentStatus,
    rescheduleBooking,
    getDashboardStats,
    deleteBooking,
    resetAllBookings,
    getBookingById
} from '../controllers/bookingController.js';

// Import your auth middleware (Adjust path if yours is different)
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- PUBLIC ROUTE ---
// Get blocked slots for a date (Required for calendar UI)
router.get('/slots', getBookedSlots);

// --- SECURED ROUTES ---
// Create a booking (Now requires login)
router.post('/', authenticateToken, createBooking);

// 💳 Razorpay: Create Payment Order (50% advance)
router.post('/create-order', authenticateToken, createPaymentOrder);

// 💳 Razorpay: Verify Payment & Create Booking
router.post('/verify-payment', authenticateToken, verifyPaymentAndBook);


// --- USER ROUTES (Protected) ---
// Get bookings for the specific logged-in user
router.get('/my-bookings', authenticateToken, getUserBookings);

// Reschedule a specific booking
router.put('/:id/reschedule', authenticateToken, rescheduleBooking);


// --- ADMIN ROUTES (Protected + Admin Only) ---
// Get all bookings for admin dashboard
router.get('/', authenticateToken, authorizeAdmin, getAllBookings);

// Get dashboard statistics
router.get('/stats', authenticateToken, authorizeAdmin, getDashboardStats);

// Update booking status (Confirm/Reject/Complete)
router.put('/:id/status', authenticateToken, authorizeAdmin, updateBookingStatus);

// 💳 Update payment status (Mark Remaining Paid)
router.put('/:id/payment-status', authenticateToken, authorizeAdmin, updatePaymentStatus);

router.delete('/:id', authenticateToken, authorizeAdmin, deleteBooking);

// ⚠️ RESET DATA ROUTE
router.delete('/actions/reset-all', authenticateToken, authorizeAdmin, resetAllBookings);

// Get single booking by ID (Public so users clicking link from chat can view their own pending booking to prefill)
router.get('/:id', getBookingById);

export default router;