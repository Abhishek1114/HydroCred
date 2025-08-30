import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { User } from '../models/User';
import { ProductionRequest } from '../models/ProductionRequest';
import { AuditLog } from '../models/AuditLog';
import { Transaction } from '../models/Transaction';
import { blockchainService } from '../lib/blockchain';
import { authMiddleware, requireRole, requireProducer, AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config/env';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/production');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `production-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|csv|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, PDF, DOC, DOCX, CSV, XLSX'));
    }
  }
});

// Validation schemas
const productionRequestSchema = z.object({
  hydrogenAmount: z.number().min(0.01).max(1000),
  productionDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date'),
  productionMethod: z.enum(['ELECTROLYSIS', 'STEAM_REFORMING', 'BIOMASS_GASIFICATION', 'OTHER']),
  energySource: z.enum(['SOLAR', 'WIND', 'HYDRO', 'GEOTHERMAL', 'NUCLEAR', 'MIXED_RENEWABLE', 'OTHER']),
  metadata: z.object({
    facilityName: z.string().optional(),
    facilityLocation: z.string().optional(),
    productionEfficiency: z.number().optional(),
    carbonIntensity: z.number().optional(),
    verificationMethod: z.string().optional(),
    qualityMetrics: z.object({
      purity: z.number().optional(),
      pressure: z.number().optional(),
      temperature: z.number().optional()
    }).optional()
  }).optional()
});

/**
 * @route POST /api/production/submit
 * @desc Submit a production request (Producer only)
 */
router.post('/submit', requireProducer, upload.array('documents', 10), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = productionRequestSchema.parse(req.body);
    
    // Get producer info
    const producer = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!producer || !producer.isVerified) {
      return res.status(403).json({ error: 'Producer not verified' });
    }

    // Generate unique request ID and hash
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const requestData = {
      requestId,
      producerAddress: producer.walletAddress,
      cityId: producer.cityId,
      ...data,
      timestamp: new Date().toISOString()
    };
    const requestHash = blockchainService.generateRequestHash(requestData);

    // Check for duplicate hash (fraud prevention)
    const existingRequest = await ProductionRequest.findOne({ requestHash });
    if (existingRequest) {
      return res.status(400).json({ error: 'Duplicate production request detected' });
    }

    // Save uploaded documents
    const documentPaths: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        documentPaths.push(file.path);
      }
    }

    // Create production request
    const productionRequest = new ProductionRequest({
      requestId,
      requestHash,
      producerAddress: producer.walletAddress,
      cityId: producer.cityId!,
      stateId: producer.stateId!,
      countryId: producer.countryId!,
      hydrogenAmount: data.hydrogenAmount,
      productionDate: new Date(data.productionDate),
      productionMethod: data.productionMethod,
      energySource: data.energySource,
      certificationDocuments: documentPaths,
      status: 'PENDING',
      metadata: data.metadata || {}
    });

    await productionRequest.save();

    // Log the submission
    await new AuditLog({
      action: 'PRODUCTION_REQUEST_SUBMITTED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      resourceType: 'PRODUCTION_REQUEST',
      resourceId: productionRequest._id.toString(),
      details: {
        after: {
          requestId,
          hydrogenAmount: data.hydrogenAmount,
          cityId: producer.cityId
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();

    res.json({
      success: true,
      message: 'Production request submitted successfully',
      request: {
        requestId,
        requestHash,
        status: 'PENDING',
        hydrogenAmount: data.hydrogenAmount,
        productionDate: data.productionDate,
        submittedAt: productionRequest.createdAt
      }
    });

  } catch (error) {
    console.error('Submit production request error:', error);
    res.status(500).json({ error: 'Failed to submit production request' });
  }
});

/**
 * @route POST /api/production/certify/:requestId
 * @desc Certify a production request (City Admin only)
 */
router.post('/certify/:requestId', requireRole(['CITY_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;

    // Get the production request
    const productionRequest = await ProductionRequest.findOne({ requestId });
    if (!productionRequest) {
      return res.status(404).json({ error: 'Production request not found' });
    }

    if (productionRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Verify city admin can certify this request
    const cityAdmin = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!cityAdmin || cityAdmin.cityId !== productionRequest.cityId) {
      return res.status(403).json({ error: 'Can only certify requests within your city' });
    }

    // Certify on blockchain
    const txHash = await blockchainService.certifyRequest(productionRequest.requestHash, productionRequest.cityId);

    // Update request status
    productionRequest.status = 'CERTIFIED';
    productionRequest.certifiedBy = req.user.walletAddress;
    productionRequest.certifiedAt = new Date();
    await productionRequest.save();

    // Log the certification
    await new AuditLog({
      action: 'PRODUCTION_REQUEST_CERTIFIED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      targetAddress: productionRequest.producerAddress,
      resourceType: 'PRODUCTION_REQUEST',
      resourceId: productionRequest._id.toString(),
      details: {
        before: { status: 'PENDING' },
        after: { status: 'CERTIFIED' },
        metadata: { transactionHash: txHash }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      transactionHash: txHash
    }).save();

    res.json({
      success: true,
      message: 'Production request certified successfully',
      request: {
        requestId,
        status: 'CERTIFIED',
        certifiedBy: req.user.walletAddress,
        certifiedAt: productionRequest.certifiedAt
      },
      transactionHash: txHash
    });

  } catch (error) {
    console.error('Certify production request error:', error);
    res.status(500).json({ error: 'Failed to certify production request' });
  }
});

/**
 * @route POST /api/production/issue/:requestId
 * @desc Issue credits for a certified production request (City Admin only)
 */
router.post('/issue/:requestId', requireRole(['CITY_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;

    // Get the production request
    const productionRequest = await ProductionRequest.findOne({ requestId });
    if (!productionRequest) {
      return res.status(404).json({ error: 'Production request not found' });
    }

    if (productionRequest.status !== 'CERTIFIED') {
      return res.status(400).json({ error: 'Request must be certified before issuing credits' });
    }

    // Verify city admin can issue for this request
    const cityAdmin = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!cityAdmin || cityAdmin.cityId !== productionRequest.cityId) {
      return res.status(403).json({ error: 'Can only issue credits within your city' });
    }

    // Issue credits on blockchain
    const { txHash, tokenIds } = await blockchainService.batchIssueCredits(
      productionRequest.producerAddress,
      productionRequest.hydrogenAmount,
      productionRequest.requestHash
    );

    // Update request status
    productionRequest.status = 'ISSUED';
    productionRequest.tokensIssued = tokenIds;
    productionRequest.issuedAt = new Date();
    await productionRequest.save();

    // Record transactions in database
    for (const tokenId of tokenIds) {
      await new Transaction({
        transactionHash: txHash,
        blockNumber: await blockchainService.getBlockNumber(),
        tokenId,
        fromAddress: '0x0000000000000000000000000000000000000000', // Mint from zero address
        toAddress: productionRequest.producerAddress,
        transactionType: 'MINT',
        amount: 1,
        cityId: productionRequest.cityId,
        stateId: productionRequest.stateId,
        countryId: productionRequest.countryId,
        timestamp: new Date(),
        metadata: {
          production: {
            productionDate: productionRequest.productionDate,
            facilityName: productionRequest.metadata.facilityName,
            hydrogenAmount: 1 // Each token = 1kg
          }
        }
      }).save();
    }

    // Log the issuance
    await new AuditLog({
      action: 'CREDITS_ISSUED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      targetAddress: productionRequest.producerAddress,
      resourceType: 'PRODUCTION_REQUEST',
      resourceId: productionRequest._id.toString(),
      details: {
        before: { status: 'CERTIFIED' },
        after: { status: 'ISSUED', tokenIds },
        metadata: { transactionHash: txHash, amount: productionRequest.hydrogenAmount }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      transactionHash: txHash
    }).save();

    res.json({
      success: true,
      message: 'Credits issued successfully',
      request: {
        requestId,
        status: 'ISSUED',
        tokensIssued: tokenIds,
        issuedAt: productionRequest.issuedAt
      },
      transactionHash: txHash
    });

  } catch (error) {
    console.error('Issue credits error:', error);
    res.status(500).json({ error: 'Failed to issue credits' });
  }
});

/**
 * @route GET /api/production/requests
 * @desc Get production requests (filtered by role)
 */
router.get('/requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let filter: any = {};

    // Filter based on user role
    switch (user.role) {
      case 'PRODUCER':
        filter.producerAddress = user.walletAddress;
        break;
      case 'CITY_ADMIN':
        filter.cityId = user.cityId;
        break;
      case 'STATE_ADMIN':
        filter.stateId = user.stateId;
        break;
      case 'COUNTRY_ADMIN':
        filter.countryId = user.countryId;
        break;
      case 'MAIN_ADMIN':
        // Can see all requests
        break;
      default:
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Add status filter if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const requests = await ProductionRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('producerAddress', 'name organizationName', User);

    const total = await ProductionRequest.countDocuments(filter);

    res.json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get production requests error:', error);
    res.status(500).json({ error: 'Failed to get production requests' });
  }
});

/**
 * @route GET /api/production/requests/:requestId
 * @desc Get a specific production request
 */
router.get('/requests/:requestId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    
    const productionRequest = await ProductionRequest.findOne({ requestId });
    if (!productionRequest) {
      return res.status(404).json({ error: 'Production request not found' });
    }

    // Check permissions
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const canView = 
      user.role === 'MAIN_ADMIN' ||
      (user.role === 'COUNTRY_ADMIN' && user.countryId === productionRequest.countryId) ||
      (user.role === 'STATE_ADMIN' && user.stateId === productionRequest.stateId) ||
      (user.role === 'CITY_ADMIN' && user.cityId === productionRequest.cityId) ||
      (user.role === 'PRODUCER' && user.walletAddress === productionRequest.producerAddress) ||
      user.role === 'AUDITOR';

    if (!canView) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json({
      success: true,
      request: productionRequest
    });

  } catch (error) {
    console.error('Get production request error:', error);
    res.status(500).json({ error: 'Failed to get production request' });
  }
});

/**
 * @route POST /api/production/reject/:requestId
 * @desc Reject a production request (City Admin only)
 */
router.post('/reject/:requestId', requireRole(['CITY_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);

    // Get the production request
    const productionRequest = await ProductionRequest.findOne({ requestId });
    if (!productionRequest) {
      return res.status(404).json({ error: 'Production request not found' });
    }

    if (productionRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Verify city admin can reject this request
    const cityAdmin = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!cityAdmin || cityAdmin.cityId !== productionRequest.cityId) {
      return res.status(403).json({ error: 'Can only reject requests within your city' });
    }

    // Update request status
    productionRequest.status = 'REJECTED';
    productionRequest.rejectionReason = reason;
    productionRequest.certifiedBy = req.user.walletAddress;
    productionRequest.certifiedAt = new Date();
    await productionRequest.save();

    // Log the rejection
    await new AuditLog({
      action: 'PRODUCTION_REQUEST_REJECTED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      targetAddress: productionRequest.producerAddress,
      resourceType: 'PRODUCTION_REQUEST',
      resourceId: productionRequest._id.toString(),
      details: {
        before: { status: 'PENDING' },
        after: { status: 'REJECTED', reason },
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();

    res.json({
      success: true,
      message: 'Production request rejected',
      request: {
        requestId,
        status: 'REJECTED',
        rejectionReason: reason,
        rejectedBy: req.user.walletAddress,
        rejectedAt: productionRequest.certifiedAt
      }
    });

  } catch (error) {
    console.error('Reject production request error:', error);
    res.status(500).json({ error: 'Failed to reject production request' });
  }
});

/**
 * @route GET /api/production/stats
 * @desc Get production statistics
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let filter: any = {};

    // Filter based on user role
    switch (user.role) {
      case 'PRODUCER':
        filter.producerAddress = user.walletAddress;
        break;
      case 'CITY_ADMIN':
        filter.cityId = user.cityId;
        break;
      case 'STATE_ADMIN':
        filter.stateId = user.stateId;
        break;
      case 'COUNTRY_ADMIN':
        filter.countryId = user.countryId;
        break;
      case 'MAIN_ADMIN':
      case 'AUDITOR':
        // Can see all stats
        break;
      default:
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get production statistics
    const stats = await ProductionRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHydrogen: { $sum: '$hydrogenAmount' },
          avgHydrogen: { $avg: '$hydrogenAmount' }
        }
      }
    ]);

    // Get monthly production trend
    const monthlyStats = await ProductionRequest.aggregate([
      { $match: { ...filter, status: 'ISSUED' } },
      {
        $group: {
          _id: {
            year: { $year: '$productionDate' },
            month: { $month: '$productionDate' }
          },
          totalHydrogen: { $sum: '$hydrogenAmount' },
          requestCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      stats: {
        overview: stats,
        monthlyTrend: monthlyStats,
        jurisdiction: {
          countryId: user.countryId,
          stateId: user.stateId,
          cityId: user.cityId
        }
      }
    });

  } catch (error) {
    console.error('Get production stats error:', error);
    res.status(500).json({ error: 'Failed to get production statistics' });
  }
});

export default router;