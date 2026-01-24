import jwt from 'jsonwebtoken';

// Middleware to verify if the user is logged in
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.user = decodedUser; // attach decoded user to request
    next();
  });
};

// Middleware to verify if the user is an Admin
// Renamed from 'isAdmin' to 'authorizeAdmin' to fix the error
export const authorizeAdmin = (req, res, next) => {
  // Make sure 'role' exists and equals admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};