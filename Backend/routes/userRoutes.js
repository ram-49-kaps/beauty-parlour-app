import { Router } from 'express';
import { uploadProfileImage, deleteProfileImage } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Route: PUT /api/users/profile-image (Matching Frontend)
router.put('/profile-image', authenticateToken, upload.single('image'), uploadProfileImage);

router.delete('/profile-image', authenticateToken, deleteProfileImage);

export default router;