import { Router } from 'express';
import {
  getAllAddons,
  createAddon,
  updateAddon,
  deleteAddon,
  uploadAddonImage,
  getBookingAddons,
  addAddonsToBooking,
  removeAddonFromBooking
} from '../controllers/addonController.js';

import { upload } from '../middleware/uploadMiddleware.js';
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// --- Public Routes ---
router.get('/add-ons', getAllAddons);
router.get('/bookings/:bookingId/add-ons', authenticateToken, getBookingAddons);

// --- Admin Routes ---
router.post('/add-ons', authenticateToken, authorizeAdmin, createAddon);
router.post('/add-ons/upload', authenticateToken, authorizeAdmin, upload.single('image'), uploadAddonImage);
router.put('/add-ons/:id', authenticateToken, authorizeAdmin, updateAddon);
router.delete('/add-ons/:id', authenticateToken, authorizeAdmin, deleteAddon);

// --- Booking Add-ons Routes ---
router.post('/bookings/:bookingId/add-ons', authenticateToken, addAddonsToBooking);
router.delete('/bookings/:bookingId/add-ons/:addonId', authenticateToken, removeAddonFromBooking);

export default router;
