import express from 'express';
import { validateCoupon, checkCouponEligibility } from '../controllers/couponController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validate a coupon code (requires login)
router.post('/validate', authenticateToken, validateCoupon);

// Check if logged-in user is eligible for a welcome coupon
router.get('/check-eligibility', authenticateToken, checkCouponEligibility);

export default router;
