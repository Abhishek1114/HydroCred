import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user: {
    walletAddress: string;
    role: string;
    userId: string;
  };
}

/**
 * Authentication middleware
 */
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Verify user still exists and is active
    const user = await User.findOne({ 
      walletAddress: decoded.walletAddress,
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = {
      walletAddress: user.walletAddress,
      role: user.role,
      userId: user._id.toString()
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Admin-only middleware (any admin level)
 */
export const requireAdmin = requireRole(['MAIN_ADMIN', 'COUNTRY_ADMIN', 'STATE_ADMIN', 'CITY_ADMIN']);

/**
 * Producer-only middleware
 */
export const requireProducer = requireRole(['PRODUCER']);

/**
 * Buyer-only middleware
 */
export const requireBuyer = requireRole(['BUYER']);

/**
 * Producer or Buyer middleware
 */
export const requireProducerOrBuyer = requireRole(['PRODUCER', 'BUYER']);

/**
 * Auditor access middleware (read-only)
 */
export const requireAuditor = requireRole(['AUDITOR', 'MAIN_ADMIN', 'COUNTRY_ADMIN', 'STATE_ADMIN', 'CITY_ADMIN']);