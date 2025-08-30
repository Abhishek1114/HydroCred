import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { config } from '../config/env';
import { database } from '../config/database';
import { blockchainService } from '../lib/blockchain';

// Import route modules
import authRoutes from './auth';
import adminRoutes from './admin';
import productionRoutes from './production';
import marketplaceRoutes from './marketplace';
import auditRoutes from './audit';
import tokenRoutes from './tokens';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/production', productionRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/audit', auditRoutes);
router.use('/tokens', tokenRoutes);

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const dbStatus = database.getConnectionStatus();
    const blockNumber = await blockchainService.getBlockNumber();
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'HydroCred Backend API',
      version: '2.0.0',
      database: dbStatus ? 'connected' : 'disconnected',
      blockchain: {
        connected: !!blockNumber,
        latestBlock: blockNumber,
        network: config.rpcUrl.includes('localhost') ? 'local' : 'testnet'
      },
      config: {
        contractAddress: config.contractAddress,
        mainAdmin: config.mainAdminAddress
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      error: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// System status endpoint
router.get('/status', async (req: Request, res: Response) => {
  try {
    const [totalSupply, activeSupply] = await Promise.all([
      blockchainService.getTotalSupply(),
      blockchainService.getActiveSupply()
    ]);

    res.json({
      success: true,
      system: {
        totalCredits: totalSupply,
        activeCredits: activeSupply,
        retiredCredits: totalSupply - activeSupply,
        contractAddress: config.contractAddress,
        mainAdmin: config.mainAdminAddress,
        network: config.rpcUrl.includes('localhost') ? 'local' : 'testnet'
      }
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// File upload endpoint for general use
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/general');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `upload-${uniqueSuffix}${path.extname(file.originalname)}`);
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
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

export default router;