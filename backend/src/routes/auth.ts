import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { blockchainService } from '../lib/blockchain';
import { config } from '../config/env';

const router = Router();

// Validation schemas
const walletConnectSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  signature: z.string(),
  message: z.string(),
  requestedRole: z.enum(['PRODUCER', 'BUYER', 'AUDITOR']).optional()
});

const roleRequestSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  role: z.enum(['PRODUCER', 'BUYER']),
  name: z.string().optional(),
  organizationName: z.string().optional(),
  email: z.string().email().optional(),
  cityId: z.number().optional(),
  metadata: z.object({
    licenseNumber: z.string().optional(),
    certifications: z.array(z.string()).optional(),
    contactInfo: z.object({
      phone: z.string().optional(),
      address: z.string().optional()
    }).optional()
  }).optional()
});

/**
 * @route POST /api/auth/connect
 * @desc Connect wallet and authenticate user
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message, requestedRole } = walletConnectSchema.parse(req.body);

    // Verify signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if user exists in database
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      // Check on-chain role
      const onChainRole = await blockchainService.getUserRole(walletAddress);
      
      if (onChainRole === 'NONE' && !requestedRole) {
        return res.status(400).json({ 
          error: 'No role assigned. Please request a role.',
          requiresRoleSelection: true
        });
      }

      // Create new user
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        role: onChainRole !== 'NONE' ? onChainRole : requestedRole,
        isActive: true,
        isVerified: onChainRole !== 'NONE',
        registeredAt: new Date()
      });

      await user.save();

      // Log registration
      await new AuditLog({
        action: 'USER_REGISTERED',
        userAddress: walletAddress.toLowerCase(),
        userRole: user.role,
        resourceType: 'USER',
        resourceId: user._id.toString(),
        details: { metadata: { requestedRole, onChainRole } },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        walletAddress: user.walletAddress, 
        role: user.role,
        userId: user._id 
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        role: user.role,
        isVerified: user.isVerified,
        countryId: user.countryId,
        stateId: user.stateId,
        cityId: user.cityId,
        name: user.name,
        organizationName: user.organizationName
      },
      token,
      requiresRoleSelection: !user.isVerified && user.role === 'NONE'
    });

  } catch (error) {
    console.error('Auth connect error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * @route POST /api/auth/request-role
 * @desc Request a role (Producer or Buyer)
 */
router.post('/request-role', async (req: Request, res: Response) => {
  try {
    const data = roleRequestSchema.parse(req.body);

    // Check if user exists
    let user = await User.findOne({ walletAddress: data.walletAddress.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please connect wallet first.' });
    }

    // For buyers, auto-approve
    if (data.role === 'BUYER') {
      user.role = 'BUYER';
      user.isVerified = true;
      user.name = data.name;
      user.organizationName = data.organizationName;
      user.email = data.email;
      user.metadata = data.metadata;

      await user.save();

      // Log role assignment
      await new AuditLog({
        action: 'ROLE_ASSIGNED',
        userAddress: user.walletAddress,
        userRole: 'BUYER',
        resourceType: 'USER',
        resourceId: user._id.toString(),
        details: { after: { role: 'BUYER' } },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();

      return res.json({
        success: true,
        message: 'Buyer role assigned successfully',
        user: {
          walletAddress: user.walletAddress,
          role: user.role,
          isVerified: user.isVerified
        }
      });
    }

    // For producers, mark as pending approval
    user.role = 'PRODUCER';
    user.isVerified = false; // Requires City Admin approval
    user.name = data.name;
    user.organizationName = data.organizationName;
    user.email = data.email;
    user.cityId = data.cityId;
    user.metadata = data.metadata;

    await user.save();

    // Log role request
    await new AuditLog({
      action: 'ROLE_REQUESTED',
      userAddress: user.walletAddress,
      userRole: 'PRODUCER',
      resourceType: 'USER',
      resourceId: user._id.toString(),
      details: { 
        after: { 
          role: 'PRODUCER', 
          cityId: data.cityId,
          pendingApproval: true 
        } 
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();

    res.json({
      success: true,
      message: 'Producer role requested. Awaiting City Admin approval.',
      user: {
        walletAddress: user.walletAddress,
        role: user.role,
        isVerified: user.isVerified,
        cityId: user.cityId
      }
    });

  } catch (error) {
    console.error('Role request error:', error);
    res.status(500).json({ error: 'Role request failed' });
  }
});

/**
 * @route GET /api/auth/profile
 * @desc Get user profile
 */
router.get('/profile', async (req: Request, res: Response) => {
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
    const user = await User.findOne({ walletAddress: decoded.walletAddress });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get updated on-chain role
    const onChainRole = await blockchainService.getUserRole(user.walletAddress);
    
    // Update role if it changed on-chain
    if (onChainRole !== 'NONE' && onChainRole !== user.role) {
      user.role = onChainRole as any;
      user.isVerified = true;
      await user.save();
    }

    res.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        role: user.role,
        isVerified: user.isVerified,
        countryId: user.countryId,
        stateId: user.stateId,
        cityId: user.cityId,
        name: user.name,
        organizationName: user.organizationName,
        email: user.email,
        registeredAt: user.registeredAt,
        lastLogin: user.lastLogin,
        metadata: user.metadata
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;