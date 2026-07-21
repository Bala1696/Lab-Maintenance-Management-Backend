import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { jwtConfig } from '../config/database.js';

// Generate JWT Token
export const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
};

// Verify JWT Token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    return null;
  }
};

// Hash Password
export const hashPassword = async (password) => {
  const salt = await bcryptjs.genSalt(10);
  return await bcryptjs.hash(password, salt);
};

// Compare Password
export const comparePassword = async (password, hashedPassword) => {
  return await bcryptjs.compare(password, hashedPassword);
};

// Authentication Middleware
export const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Authentication error' });
  }
};

// Authorization Middleware
export const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    next();
  };
};
