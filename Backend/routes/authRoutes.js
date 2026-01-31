import { Router } from 'express';
import { login, register, googleLogin, forgotPassword, resetPassword, notifyLaunch, triggerLaunchNotifications } from '../controllers/authController.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/notify-launch', notifyLaunch);
router.post('/trigger-launch', triggerLaunchNotifications); // 🚀 ADMIN TRIGGER

export default router;