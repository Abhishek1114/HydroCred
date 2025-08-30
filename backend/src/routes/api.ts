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
  destination: (req: Request, file: any, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Request, file: any, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: Request, file: any, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const isExtensionAllowed = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isMimeAllowed = allowedTypes.test(file.mimetype);
    if (isMimeAllowed && isExtensionAllowed) {
      cb(null, true);
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
      fromBlock: z.string().optional().transform(val => val ? parseInt(val) : undefined)
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
        name: `Green Hydrogen Credit #${tokenId}`,
        description: 'Represents 1 unit of verified green hydrogen production',
      }
    });
  } catch (error) {
    console.error('Token info error:', error);
    res.status(500).json({ error: 'Failed to fetch token information' });
  }
});

// Initialize default admin (idempotent)
router.post('/init-admin', async (req: Request, res: Response) => {
  try {
    await initializeDefaultAdmin();
    res.json({ success: true });
  } catch (error) {
    console.error('Admin init error:', error);
    res.status(500).json({ error: 'Failed to initialize admin' });
  }
});

// Users
router.post('/users/register', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      walletAddress: z.string(),
      name: z.string(),
      role: z.nativeEnum(UserRole),
      email: z.string().optional(),
      organization: z.string(),
      location: z.object({ country: z.string(), state: z.string(), city: z.string() }),
      verifiedBy: z.string()
    });
    const body = schema.parse(req.body);
    const result = await UserManager.createUser(body);
    res.json({ success: true, user: result });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(400).json({ error: 'Invalid registration data' });
  }
});

// Production
router.post('/production/request', async (req: Request, res: Response) => {
  try {
    const result = await ProductionManager.createProductionRequest(req.body);
    res.json({ success: true, request: result });
  } catch (error) {
    console.error('Production request error:', error);
    res.status(400).json({ error: 'Invalid production request' });
  }
});

router.get('/production/requests', async (req: Request, res: Response) => {
  try {
    const { producer } = req.query as { producer?: string };
    const result = producer
      ? await ProductionManager.getProductionRequestsByProducer(producer)
      : await ProductionManager.getAllRequests();
    res.json({ success: true, requests: result });
  } catch (error) {
    console.error('Production requests fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch production requests' });
  }
});

// Marketplace
router.post('/marketplace/listings', async (req: Request, res: Response) => {
  try {
    const result = await MarketplaceManager.createListing(req.body);
    res.json({ success: true, listing: result });
  } catch (error) {
    console.error('Marketplace listing error:', error);
    res.status(400).json({ error: 'Invalid marketplace listing' });
  }
});

router.get('/marketplace/listings', async (req: Request, res: Response) => {
  try {
    const result = await MarketplaceManager.getActiveListings();
    res.json({ success: true, listings: result });
  } catch (error) {
    console.error('Marketplace listings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace listings' });
  }
});

export default router;