import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit'; // ✅ Security: Rate Limiting


dotenv.config();

// Routes
import authRoutes from './routes/authRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js'; // 👈 Your new Chat Route

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 🔐 SECURITY
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// 🌍 CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// 📦 MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🛡️ RATE LIMITING (Prevent Brute Force)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter); // Apply to all API routes


// ==========================================
// 1. DATABASE CONNECTION
// ==========================================
// ==========================================
// 1. DATABASE CONNECTION CHECK
// ==========================================
import pool from './config/db.js';

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Connected to TiDB Cloud (MySQL)");
    connection.release();
  } catch (err) {
    console.error("❌ DB Connection Failed:", err.message);
  }
})();

// ==========================================
// 2. ADMIN LOGIN ROUTE (Fixed & Debugged)
// ==========================================
app.post('/api/admin-login', (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔐 HARDCODED CREDENTIALS 
    // 🔐 SECURE CREDENTIALS (From .env)
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error("❌ CRITICAL: Admin credentials missing in .env");
      return res.status(500).json({ message: "Server Configuration Error" });
    }

    // Normalize inputs to prevent failures from accidental spaces or casing
    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const providedPassword = password ? password.trim() : '';

    if (normalizedEmail === ADMIN_EMAIL.toLowerCase() && providedPassword === ADMIN_PASSWORD) {
      // Create Token
      const token = jwt.sign(
        { role: 'admin', email: email },
        process.env.JWT_SECRET || 'your_jwt_secret_key',
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token: token,
        user: { name: 'Owner', role: 'admin', email: email }
      });
    }

    return res.status(401).json({ message: "Invalid Owner Credentials" });

  } catch (error) {
    console.error("🔥 LOGIN ERROR:", error); // Check your terminal for this!
    return res.status(500).json({ message: "Login Server Error" });
  }
});

// ==========================================
// 3. OTHER ROUTES
// ==========================================
// Make sure these match the paths your frontend expects
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', serviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api', chatRoutes); // 👈 Register Chat Route

// Root Route ( Health Check )
app.get('/', (req, res) => {
  res.send('✅ Flawless Beauty Parlour API is Running! 🚀');
});

// 🚀 START SERVER
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});