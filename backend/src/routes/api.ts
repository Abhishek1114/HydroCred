import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { getCreditEvents } from '../lib/chain';
import { encrypt, hash } from '../lib/crypto';
import { UserManager, UserRole, initializeDefaultAdmin } from '../lib/users';
import { ProductionManager } from '../lib/production';
import { MarketplaceManager } from '../lib/marketplace';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'HydroCred Backend API'
  });
});

// File upload endpoint
router.post('/upload', upload.single('document'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileMetadata = {
      id: hash(req.file.filename),
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      // Placeholder for future IPFS integration
      ipfsHash: null,
      encryptedPath: encrypt(req.file.path)
    };

    res.json({
      success: true,
      file: fileMetadata
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Get ledger data (blockchain events)
router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const fromBlockSchema = z.object({
      fromBlock: z.string().optional().transform(val => val ? parseInt(val) : 0)
    });
    
    const { fromBlock } = fromBlockSchema.parse(req.query);
    
    const events = await getCreditEvents(fromBlock);
    
    res.json({
      success: true,
      events,
      count: events.length,
      fromBlock
    });
  } catch (error) {
    console.error('Ledger fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ledger data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific token information
router.get('/token/:tokenId', async (req: Request, res: Response) => {
  try {
    const tokenIdSchema = z.object({
      tokenId: z.string().transform(val => parseInt(val))
    });
    
    const { tokenId } = tokenIdSchema.parse(req.params);
    
    // This would fetch token metadata from IPFS in the future
    res.json({
      success: true,
      tokenId,
      metadata: {
        // Placeholder metadata
        name: `HydroCred Token #${tokenId}`,
        description: 'Green Hydrogen Production Credit',
        attributes: [
          { trait_type: 'Type', value: 'Green Hydrogen Credit' },
          { trait_type: 'Unit', value: '1 verified unit' }
        ]
      }
    });
  } catch (error) {
    console.error('Token fetch error:', error);
    res.status(400).json({ error: 'Invalid token ID' });
  }
});

// User Management Endpoints
router.post('/users/register', async (req: Request, res: Response) => {
  try {
    const userSchema = z.object({
      walletAddress: z.string().min(42).max(42),
      role: z.nativeEnum(UserRole),
      name: z.string().min(1),
      email: z.string().email().optional(),
      organization: z.string().min(1),
      location: z.object({
        country: z.string().min(1),
        state: z.string().min(1),
        city: z.string().min(1)
      })
    });
    
    const userData = userSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await UserManager.getUserByWallet(userData.walletAddress);
    if (existingUser) {
      return res.status(400).json({ error: 'User already registered with this wallet' });
    }
    
    // Add verifiedBy field for new users (self-verified initially)
    const userDataWithVerification = {
      ...userData,
      verifiedBy: userData.walletAddress // Self-verified initially
    };
    
    const user = await UserManager.createUser(userDataWithVerification);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name,
        organization: user.organization,
        location: user.location,
        status: user.status
      }
    });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(400).json({ error: 'Invalid user data' });
  }
});

router.get('/users/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const user = await UserManager.getUserByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name,
        organization: user.organization,
        location: user.location,
        status: user.status,
        verifiedAt: user.verifiedAt
      }
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Production Request Endpoints
router.post('/production/request', async (req: Request, res: Response) => {
  try {
    const requestSchema = z.object({
      producerWallet: z.string().min(42).max(42),
      producerName: z.string().min(1),
      organization: z.string().min(1),
      location: z.object({
        country: z.string().min(1),
        state: z.string().min(1),
        city: z.string().min(1)
      }),
      productionData: z.object({
        hydrogenAmount: z.number().positive(),
        productionDate: z.string().transform(val => new Date(val)),
        energySource: z.string().min(1),
        energySourceDetails: z.string(),
        carbonFootprint: z.number().min(0),
        certificationDocuments: z.array(z.string())
      })
    });
    
    const requestData = requestSchema.parse(req.body);
    
    // Verify producer exists and is verified
    const producer = await UserManager.getUserByWallet(requestData.producerWallet);
    if (!producer || producer.role !== UserRole.PRODUCER) {
      return res.status(400).json({ error: 'Invalid producer wallet or role' });
    }
    
    if (producer.status !== 'verified') {
      return res.status(400).json({ error: 'Producer account not verified' });
    }
    
    const request = await ProductionManager.createProductionRequest(requestData);
    
    res.json({
      success: true,
      request: {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt
      }
    });
  } catch (error) {
    console.error('Production request error:', error);
    res.status(400).json({ error: 'Invalid request data' });
  }
});

router.get('/production/requests', async (req: Request, res: Response) => {
  try {
    const { status, producer, country, state, city } = req.query;
    
    let requests;
    if (status) {
      requests = await ProductionManager.getRequestsByStatus(status as any);
    } else if (producer) {
      requests = await ProductionManager.getProductionRequestsByProducer(producer as string);
    } else if (country || state || city) {
      requests = await ProductionManager.getRequestsByLocation(country as string, state as string, city as string);
    } else {
      requests = await ProductionManager.getAllRequests();
    }
    
    res.json({
      success: true,
      requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Production requests fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch production requests' });
  }
});

router.post('/production/approve/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { certifierWallet, creditsToIssue } = req.body;
    
    if (!certifierWallet || !creditsToIssue) {
      return res.status(400).json({ error: 'Missing certifier wallet or credits amount' });
    }
    
    const success = await ProductionManager.approveRequest(requestId, certifierWallet, creditsToIssue);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to approve request' });
    }
    
    res.json({
      success: true,
      message: 'Production request approved successfully'
    });
  } catch (error) {
    console.error('Production approval error:', error);
    res.status(500).json({ error: 'Failed to approve production request' });
  }
});

// Marketplace Endpoints
router.get('/marketplace/listings', async (req: Request, res: Response) => {
  try {
    const { minPrice, maxPrice, seller, search } = req.query;
    
    let listings;
    if (minPrice && maxPrice) {
      listings = await MarketplaceManager.getListingsByPriceRange(
        parseFloat(minPrice as string),
        parseFloat(maxPrice as string)
      );
    } else if (seller) {
      listings = await MarketplaceManager.getListingsBySeller(seller as string);
    } else if (search) {
      listings = await MarketplaceManager.searchListings(search as string);
    } else {
      listings = await MarketplaceManager.getActiveListings();
    }
    
    res.json({
      success: true,
      listings,
      count: listings.length
    });
  } catch (error) {
    console.error('Marketplace listings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace listings' });
  }
});

router.post('/marketplace/listing', async (req: Request, res: Response) => {
  try {
    const listingSchema = z.object({
      sellerWallet: z.string().min(42).max(42),
      sellerName: z.string().min(1),
      tokenIds: z.array(z.number().positive()),
      pricePerCredit: z.number().positive(),
      totalPrice: z.number().positive()
    });
    
    const listingData = listingSchema.parse(req.body);
    
    const listing = await MarketplaceManager.createListing(listingData);
    
    res.json({
      success: true,
      listing: {
        id: listing.id,
        status: listing.status,
        createdAt: listing.createdAt,
        expiresAt: listing.expiresAt
      }
    });
  } catch (error) {
    console.error('Marketplace listing creation error:', error);
    res.status(400).json({ error: 'Invalid listing data' });
  }
});

router.post('/marketplace/purchase/:listingId', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;
    const { buyerWallet } = req.body;
    
    if (!buyerWallet) {
      return res.status(400).json({ error: 'Missing buyer wallet' });
    }
    
    const transaction = await MarketplaceManager.purchaseCredits(listingId, buyerWallet);
    
    if (!transaction) {
      return res.status(400).json({ error: 'Failed to purchase credits' });
    }
    
    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        totalPrice: transaction.totalPrice,
        tokenIds: transaction.tokenIds
      }
    });
  } catch (error) {
    console.error('Marketplace purchase error:', error);
    res.status(500).json({ error: 'Failed to process purchase' });
  }
});

// Analytics and Audit Endpoints
router.get('/analytics/overview', async (req: Request, res: Response) => {
  try {
    const [userStats, productionStats, marketplaceStats] = await Promise.all([
      UserManager.getAllUsers().then(users => ({
        total: users.length,
        byRole: Object.values(UserRole).reduce((acc, role) => {
          acc[role] = users.filter(u => u.role === role).length;
          return acc;
        }, {} as Record<string, number>)
      })),
      ProductionManager.getRequestStats(),
      MarketplaceManager.getMarketplaceStats()
    ]);
    
    res.json({
      success: true,
      analytics: {
        users: userStats,
        production: productionStats,
        marketplace: marketplaceStats
      }
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/audit/export', async (req: Request, res: Response) => {
  try {
    const { format = 'json' } = req.query;
    
    const [users, productionRequests, marketplaceListings] = await Promise.all([
      UserManager.getAllUsers(),
      ProductionManager.getAllRequests(),
      MarketplaceManager.getActiveListings()
    ]);
    
    const auditData = {
      exportDate: new Date().toISOString(),
      users,
      productionRequests,
      marketplaceListings
    };
    
    if (format === 'csv') {
      // TODO: Implement CSV export
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="hydrocred-audit.csv"');
      res.send('CSV export not yet implemented');
    } else {
      res.json({
        success: true,
        data: auditData
      });
    }
  } catch (error) {
    console.error('Audit export error:', error);
    res.status(500).json({ error: 'Failed to export audit data' });
  }
});

// Initialize default admin on first request
router.get('/init', async (req: Request, res: Response) => {
  try {
    await initializeDefaultAdmin();
    res.json({
      success: true,
      message: 'Default admin initialized'
    });
  } catch (error) {
    console.error('Admin initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize admin' });
  }
});

export default router;