import { Router } from 'express';
import {
  getAllServices,
  getGallery,
  createService,
  updateService,
  deleteService,
  reorderServices,
  addGalleryItem,
  deleteGalleryItem,
  uploadServiceImage,
  getServiceRecommendations
} from '../controllers/serviceController.js';

import { upload } from '../middleware/uploadMiddleware.js'; // 👈 Added

// ✅ 1. Import both middlewares (Note: 'authorizeAdmin', not 'isAdmin')
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// --- Public Routes ---
// (Anyone can see services and gallery)
router.get('/services', getAllServices);
router.get('/gallery', getGallery); // Using renamed getGallery
router.get('/recommendations', getServiceRecommendations); // City-based recommendations

// --- Admin Routes ---
// (Protected: User must be logged in AND be an admin)
router.post('/services', authenticateToken, authorizeAdmin, createService);
router.post('/services/upload', authenticateToken, authorizeAdmin, upload.single('image'), uploadServiceImage);
router.put('/services/reorder', authenticateToken, authorizeAdmin, reorderServices);
router.put('/services/:id', authenticateToken, authorizeAdmin, updateService);
router.delete('/services/:id', authenticateToken, authorizeAdmin, deleteService);

// New Gallery Admin Routes
router.post('/gallery', authenticateToken, authorizeAdmin, addGalleryItem); // Added
router.delete('/gallery/:id', authenticateToken, authorizeAdmin, deleteGalleryItem); // Added

export default router;