import { Router } from 'express';
import { uploadProfileImage,deleteProfileImage } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Route: POST /api/users/profile-image
router.post('/profile-image', authenticateToken, upload.single('image'), uploadProfileImage);

router.delete('/profile-image', authenticateToken, deleteProfileImage);

export default router;