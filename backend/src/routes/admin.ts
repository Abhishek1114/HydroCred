import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { ProductionRequest } from '../models/ProductionRequest';
import { AuditLog } from '../models/AuditLog';
import { Transaction } from '../models/Transaction';
import { blockchainService } from '../lib/blockchain';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all admin routes
router.use(authMiddleware);

// Validation schemas
const appointAdminSchema = z.object({
  adminAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  name: z.string().optional(),
  organizationName: z.string().optional(),
  email: z.string().email().optional(),
  countryId: z.number().optional(),
  stateId: z.number().optional()
});

const approveProducerSchema = z.object({
  producerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  cityId: z.number()
});

/**
 * @route POST /api/admin/appoint-country-admin
 * @desc Appoint a Country Admin (Main Admin only)
 */
router.post('/appoint-country-admin', requireRole(['MAIN_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { adminAddress, name, organizationName, email } = appointAdminSchema.parse(req.body);

    // Check if user already has a role
    const existingUser = await User.findOne({ walletAddress: adminAddress.toLowerCase() });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ error: 'User already has an assigned role' });
    }

    // Appoint on blockchain
    const { txHash, countryId } = await blockchainService.appointCountryAdmin(adminAddress);

    // Update or create user in database
    const user = await User.findOneAndUpdate(
      { walletAddress: adminAddress.toLowerCase() },
      {
        walletAddress: adminAddress.toLowerCase(),
        role: 'COUNTRY_ADMIN',
        countryId,
        name,
        organizationName,
        email,
        isActive: true,
        isVerified: true
      },
      { upsert: true, new: true }
    );

    // Log the appointment
    await new AuditLog({
      action: 'COUNTRY_ADMIN_APPOINTED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      targetAddress: adminAddress.toLowerCase(),
      resourceType: 'ROLE',
      resourceId: user._id.toString(),
      details: {
        after: { role: 'COUNTRY_ADMIN', countryId },
        metadata: { transactionHash: txHash }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      transactionHash: txHash
    }).save();

    res.json({
      success: true,
      message: 'Country Admin appointed successfully',
      admin: {
        walletAddress: user.walletAddress,
        role: user.role,
        countryId: user.countryId,
        name: user.name,
        organizationName: user.organizationName
      },
      transactionHash: txHash
    });

  } catch (error) {
    console.error('Appoint country admin error:', error);
    res.status(500).json({ error: 'Failed to appoint country admin' });
  }
});

/**
 * @route POST /api/admin/appoint-state-admin
 * @desc Appoint a State Admin (Country Admin only)
 */
router.post('/appoint-state-admin', requireRole(['COUNTRY_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { adminAddress, name, organizationName, email, countryId } = appointAdminSchema.parse(req.body);

    // Verify country admin can only appoint within their country
    const requesterUser = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!requesterUser || requesterUser.countryId !== countryId) {
      return res.status(403).json({ error: 'Can only appoint admins within your country' });
    }

    // Check if user already has a role
    const existingUser = await User.findOne({ walletAddress: adminAddress.toLowerCase() });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ error: 'User already has an assigned role' });
    }

    // Appoint on blockchain
    const { txHash, stateId } = await blockchainService.appointStateAdmin(adminAddress, countryId!);

    // Update or create user in database
    const user = await User.findOneAndUpdate(
      { walletAddress: adminAddress.toLowerCase() },
      {
        walletAddress: adminAddress.toLowerCase(),
        role: 'STATE_ADMIN',
        countryId,
        stateId,
        name,
        organizationName,
        email,
        isActive: true,
        isVerified: true
      },
      { upsert: true, new: true }
    );

    // Log the appointment
    await new AuditLog({
      action: 'STATE_ADMIN_APPOINTED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      targetAddress: adminAddress.toLowerCase(),
      resourceType: 'ROLE',
      resourceId: user._id.toString(),
      details: {
        after: { role: 'STATE_ADMIN', countryId, stateId },
        metadata: { transactionHash: txHash }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      transactionHash: txHash
    }).save();

    res.json({
      success: true,
      message: 'State Admin appointed successfully',
      admin: {
        walletAddress: user.walletAddress,
        role: user.role,
        countryId: user.countryId,
        stateId: user.stateId,
        name: user.name,
        organizationName: user.organizationName
      },
      transactionHash: txHash
    });

  } catch (error) {
    console.error('Appoint state admin error:', error);
    res.status(500).json({ error: 'Failed to appoint state admin' });
  }
});

/**
 * @route POST /api/admin/appoint-city-admin
 * @desc Appoint a City Admin (State Admin only)
 */
router.post('/appoint-city-admin', requireRole(['STATE_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { adminAddress, name, organizationName, email, stateId } = appointAdminSchema.parse(req.body);

    // Verify state admin can only appoint within their state
    const requesterUser = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!requesterUser || requesterUser.stateId !== stateId) {
      return res.status(403).json({ error: 'Can only appoint admins within your state' });
    }

    // Check if user already has a role
    const existingUser = await User.findOne({ walletAddress: adminAddress.toLowerCase() });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ error: 'User already has an assigned role' });
    }

    // Appoint on blockchain
    const { txHash, cityId } = await blockchainService.appointCityAdmin(adminAddress, stateId!);

    // Update or create user in database
    const user = await User.findOneAndUpdate(
      { walletAddress: adminAddress.toLowerCase() },
      {
        walletAddress: adminAddress.toLowerCase(),
        role: 'CITY_ADMIN',
        countryId: requesterUser.countryId,
        stateId,
        cityId,
        name,
        organizationName,
        email,
        isActive: true,
        isVerified: true
      },
      { upsert: true, new: true }
    );

    // Log the appointment
    await new AuditLog({
      action: 'CITY_ADMIN_APPOINTED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      targetAddress: adminAddress.toLowerCase(),
      resourceType: 'ROLE',
      resourceId: user._id.toString(),
      details: {
        after: { role: 'CITY_ADMIN', countryId: user.countryId, stateId, cityId },
        metadata: { transactionHash: txHash }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      transactionHash: txHash
    }).save();

    res.json({
      success: true,
      message: 'City Admin appointed successfully',
      admin: {
        walletAddress: user.walletAddress,
        role: user.role,
        countryId: user.countryId,
        stateId: user.stateId,
        cityId: user.cityId,
        name: user.name,
        organizationName: user.organizationName
      },
      transactionHash: txHash
    });

  } catch (error) {
    console.error('Appoint city admin error:', error);
    res.status(500).json({ error: 'Failed to appoint city admin' });
  }
});

/**
 * @route POST /api/admin/approve-producer
 * @desc Approve a Producer (City Admin only)
 */
router.post('/approve-producer', requireRole(['CITY_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { producerAddress, cityId } = approveProducerSchema.parse(req.body);

    // Verify city admin can only approve within their city
    const requesterUser = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!requesterUser || requesterUser.cityId !== cityId) {
      return res.status(403).json({ error: 'Can only approve producers within your city' });
    }

    // Check if producer exists and is pending
    const producer = await User.findOne({ walletAddress: producerAddress.toLowerCase() });
    if (!producer) {
      return res.status(404).json({ error: 'Producer not found' });
    }

    if (producer.role !== 'PRODUCER') {
      return res.status(400).json({ error: 'User is not a producer' });
    }

    if (producer.isVerified) {
      return res.status(400).json({ error: 'Producer already approved' });
    }

    // Register on blockchain
    const txHash = await blockchainService.registerProducer(producerAddress, cityId);

    // Update producer in database
    producer.isVerified = true;
    producer.cityId = cityId;
    producer.countryId = requesterUser.countryId;
    producer.stateId = requesterUser.stateId;
    await producer.save();

    // Log the approval
    await new AuditLog({
      action: 'PRODUCER_APPROVED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      targetAddress: producerAddress.toLowerCase(),
      resourceType: 'USER',
      resourceId: producer._id.toString(),
      details: {
        before: { isVerified: false },
        after: { isVerified: true, cityId },
        metadata: { transactionHash: txHash }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      transactionHash: txHash
    }).save();

    res.json({
      success: true,
      message: 'Producer approved successfully',
      producer: {
        walletAddress: producer.walletAddress,
        role: producer.role,
        isVerified: producer.isVerified,
        cityId: producer.cityId,
        name: producer.name,
        organizationName: producer.organizationName
      },
      transactionHash: txHash
    });

  } catch (error) {
    console.error('Approve producer error:', error);
    res.status(500).json({ error: 'Failed to approve producer' });
  }
});

/**
 * @route GET /api/admin/pending-approvals
 * @desc Get pending approvals for the admin's jurisdiction
 */
router.get('/pending-approvals', requireRole(['CITY_ADMIN', 'STATE_ADMIN', 'COUNTRY_ADMIN', 'MAIN_ADMIN']), async (req: Request, res: Response) => {
  try {
    const requesterUser = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!requesterUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query: any = { isVerified: false };

    // Filter based on admin level
    switch (requesterUser.role) {
      case 'CITY_ADMIN':
        query.cityId = requesterUser.cityId;
        query.role = 'PRODUCER';
        break;
      case 'STATE_ADMIN':
        query.stateId = requesterUser.stateId;
        break;
      case 'COUNTRY_ADMIN':
        query.countryId = requesterUser.countryId;
        break;
      case 'MAIN_ADMIN':
        // Can see all pending approvals
        break;
    }

    const pendingUsers = await User.find(query)
      .select('-metadata.contactInfo')
      .sort({ registeredAt: -1 });

    res.json({
      success: true,
      pendingApprovals: pendingUsers,
      count: pendingUsers.length
    });

  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Failed to get pending approvals' });
  }
});

/**
 * @route GET /api/admin/analytics
 * @desc Get analytics data for admin dashboard
 */
router.get('/analytics', requireRole(['CITY_ADMIN', 'STATE_ADMIN', 'COUNTRY_ADMIN', 'MAIN_ADMIN']), async (req: Request, res: Response) => {
  try {
    const requesterUser = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!requesterUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let userFilter: any = {};
    let requestFilter: any = {};
    let transactionFilter: any = {};

    // Filter based on admin level
    switch (requesterUser.role) {
      case 'CITY_ADMIN':
        userFilter.cityId = requesterUser.cityId;
        requestFilter.cityId = requesterUser.cityId;
        transactionFilter.cityId = requesterUser.cityId;
        break;
      case 'STATE_ADMIN':
        userFilter.stateId = requesterUser.stateId;
        requestFilter.stateId = requesterUser.stateId;
        transactionFilter.stateId = requesterUser.stateId;
        break;
      case 'COUNTRY_ADMIN':
        userFilter.countryId = requesterUser.countryId;
        requestFilter.countryId = requesterUser.countryId;
        transactionFilter.countryId = requesterUser.countryId;
        break;
      case 'MAIN_ADMIN':
        // Can see all data
        break;
    }

    // Get user statistics
    const userStats = await User.aggregate([
      { $match: userFilter },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get production request statistics
    const requestStats = await ProductionRequest.aggregate([
      { $match: requestFilter },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$hydrogenAmount' } } }
    ]);

    // Get transaction statistics
    const transactionStats = await Transaction.aggregate([
      { $match: transactionFilter },
      { $group: { _id: '$transactionType', count: { $sum: 1 } } }
    ]);

    // Get recent activity
    const recentActivity = await AuditLog.find(
      requesterUser.role === 'MAIN_ADMIN' ? {} : { userAddress: req.user.walletAddress }
    )
      .sort({ timestamp: -1 })
      .limit(10)
      .select('action targetAddress resourceType timestamp details');

    res.json({
      success: true,
      analytics: {
        users: userStats,
        requests: requestStats,
        transactions: transactionStats,
        recentActivity,
        jurisdiction: {
          countryId: requesterUser.countryId,
          stateId: requesterUser.stateId,
          cityId: requesterUser.cityId
        }
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * @route GET /api/admin/users
 * @desc Get users in admin's jurisdiction
 */
router.get('/users', requireRole(['CITY_ADMIN', 'STATE_ADMIN', 'COUNTRY_ADMIN', 'MAIN_ADMIN']), async (req: Request, res: Response) => {
  try {
    const requesterUser = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!requesterUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let filter: any = {};

    // Filter based on admin level
    switch (requesterUser.role) {
      case 'CITY_ADMIN':
        filter.cityId = requesterUser.cityId;
        break;
      case 'STATE_ADMIN':
        filter.stateId = requesterUser.stateId;
        break;
      case 'COUNTRY_ADMIN':
        filter.countryId = requesterUser.countryId;
        break;
      case 'MAIN_ADMIN':
        // Can see all users
        break;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('-metadata.contactInfo')
      .sort({ registeredAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

export default router;