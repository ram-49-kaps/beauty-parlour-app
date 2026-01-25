import express from 'express';
import {
    createBooking,
    getAllBookings,
    getUserBookings,
    updateBookingStatus,
    rescheduleBooking,
    getDashboardStats,
    deleteBooking,
    resetAllBookings
} from '../controllers/bookingController.js';

// Import your auth middleware (Adjust path if yours is different)
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- SECURED ROUTES ---
// Create a booking (Now requires login)
router.post('/', authenticateToken, createBooking);


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

// Update booking status (Confirm/Reject)
router.put('/:id/status', authenticateToken, authorizeAdmin, updateBookingStatus);

router.delete('/:id', authenticateToken, authorizeAdmin, deleteBooking);

// ⚠️ RESET DATA ROUTE
router.delete('/actions/reset-all', authenticateToken, authorizeAdmin, resetAllBookings);

export default router;