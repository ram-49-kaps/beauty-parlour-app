import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // ✅ NEW: For generating tokens
import { query } from '../config/db.js';
import { OAuth2Client } from 'google-auth-library';
import emailService from '../utils/emailService.js'; // ✅ NEW: To send emails

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- Helper function to create JWT token ---
const createToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// --------------------- LOGIN ---------------------
const login = async (req, res) => {
  console.log("🔥 req.body received:", req.body);

  try {
    const { email, password } = req.body;

    // 1. Fetch user by email. Assuming query() returns rows ONLY (array of objects).
    const rows = await query('SELECT * FROM users WHERE email = ?', [email]);

    // Check if user was found. If rows is an empty array, no user exists.
    if (rows.length === 0) {
      // Use generic message for security
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];

    // 2. Compare the plain password with the stored hash.
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Generate Token and Respond
    const token = createToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// --------------------- REGISTER ---------------------
const register = async (req, res) => {
  console.log("📩 Registration req.body =", req.body);

  try {
    const { email, password, name } = req.body;

    // 1. Check if user already exists
    // query() returns rows ONLY (array of objects).
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);

    if (existing && existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insert new user
    // query() returns the result object for INSERT operations
    const result = await query(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, 'customer']
    );

    // Prepare user object for token generation
    const newUser = {
      id: result.insertId,
      email,
      name,
      role: 'customer'
    };

    // 4. Generate Token and Respond
    const token = createToken(newUser);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: newUser
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// --------------------- GOOGLE LOGIN ---------------------
const googleLogin = async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ message: 'Access token missing' });
    }

    // 🔐 Get Google user info
    const googleRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!googleRes.ok) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const { email, name } = await googleRes.json();

    // 🔍 Check user
    const users = await query(
      'SELECT id, email, name, role FROM users WHERE email = ?',
      [email]
    );

    let user;
    if (users.length === 0) {
      const result = await query(
        'INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)',
        [email, name, 'customer', null]
      );

      user = {
        id: result.insertId,
        email,
        name,
        role: 'customer',
      };
    } else {
      user = users[0];
    }

    // 🔑 JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Google login successful',
      token,
      user,
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Google authentication failed' });
  }
};

// --------------------- FORGOT PASSWORD (NEW) ---------------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate Token
    const token = crypto.randomBytes(32).toString('hex');
    const expireDate = new Date(Date.now() + 3600000); // 1 hour from now

    // Save to DB (Uses MySQL Format for Date)
    await query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?', 
      [token, expireDate, email]
    );

    // Send Email (Points to Frontend URL)
    const resetLink = `http://localhost:5173/reset-password/${token}`;
    await emailService.sendPasswordResetEmail(email, resetLink);

    res.json({ message: "Reset link sent to your email" });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// --------------------- RESET PASSWORD (NEW) ---------------------
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Find user with valid token and not expired
    const users = await query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', 
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update User & Clear Token
    await query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, users[0].id]
    );

    res.json({ message: "Password updated successfully. Please login." });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Export all functions
export { login, register, googleLogin, forgotPassword, resetPassword };