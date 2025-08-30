import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { MarketplaceListing } from '../models/MarketplaceListing';
import { Transaction } from '../models/Transaction';
import { AuditLog } from '../models/AuditLog';
import { blockchainService } from '../lib/blockchain';
import { authMiddleware, requireRole, requireProducer, requireBuyer, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation schemas
const createListingSchema = z.object({
  tokenIds: z.array(z.number()).min(1).max(100),
  pricePerToken: z.number().min(0.001),
  currency: z.enum(['ETH', 'MATIC', 'USD']).default('ETH'),
  metadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    certificationLevel: z.string().optional()
  }).optional()
});

const purchaseListingSchema = z.object({
  listingId: z.string(),
  tokenIds: z.array(z.number()).optional() // For partial purchases
});

/**
 * @route POST /api/marketplace/list
 * @desc Create a marketplace listing (Producer only)
 */
router.post('/list', requireProducer, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createListingSchema.parse(req.body);
    
    // Get producer info
    const producer = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!producer || !producer.isVerified) {
      return res.status(403).json({ error: 'Producer not verified' });
    }

    // Verify producer owns all tokens
    const ownedTokens = await blockchainService.getTokensOfOwner(producer.walletAddress);
    const invalidTokens = data.tokenIds.filter(id => !ownedTokens.includes(id));
    
    if (invalidTokens.length > 0) {
      return res.status(400).json({ 
        error: 'You do not own some of the specified tokens',
        invalidTokens 
      });
    }

    // Check if any tokens are already listed
    const existingListings = await MarketplaceListing.find({
      tokenIds: { $in: data.tokenIds },
      isActive: true
    });

    if (existingListings.length > 0) {
      return res.status(400).json({ error: 'Some tokens are already listed for sale' });
    }

    // Check if any tokens are retired
    for (const tokenId of data.tokenIds) {
      const isRetired = await blockchainService.isTokenRetired(tokenId);
      if (isRetired) {
        return res.status(400).json({ 
          error: `Token ${tokenId} is retired and cannot be sold` 
        });
      }
    }

    // Generate listing ID
    const listingId = `LIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalPrice = data.pricePerToken * data.tokenIds.length;

    // Create marketplace listing
    const listing = new MarketplaceListing({
      listingId,
      sellerAddress: producer.walletAddress,
      tokenIds: data.tokenIds,
      pricePerToken: data.pricePerToken,
      totalPrice,
      currency: data.currency,
      isActive: true,
      isSold: false,
      cityId: producer.cityId!,
      stateId: producer.stateId!,
      countryId: producer.countryId!,
      metadata: data.metadata || {}
    });

    await listing.save();

    // Log the listing
    await new AuditLog({
      action: 'MARKETPLACE_LISTING_CREATED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      resourceType: 'MARKETPLACE',
      resourceId: listing._id.toString(),
      details: {
        after: {
          listingId,
          tokenCount: data.tokenIds.length,
          pricePerToken: data.pricePerToken,
          totalPrice
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();

    res.json({
      success: true,
      message: 'Listing created successfully',
      listing: {
        listingId,
        tokenIds: data.tokenIds,
        pricePerToken: data.pricePerToken,
        totalPrice,
        currency: data.currency,
        createdAt: listing.createdAt
      }
    });

  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

/**
 * @route GET /api/marketplace/listings
 * @desc Get marketplace listings
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    let filter: any = { isActive: true, isSold: false };

    // Add filters
    if (req.query.cityId) filter.cityId = parseInt(req.query.cityId as string);
    if (req.query.stateId) filter.stateId = parseInt(req.query.stateId as string);
    if (req.query.countryId) filter.countryId = parseInt(req.query.countryId as string);
    if (req.query.currency) filter.currency = req.query.currency;

    // Price range filter
    if (req.query.minPrice) filter.pricePerToken = { $gte: parseFloat(req.query.minPrice as string) };
    if (req.query.maxPrice) {
      filter.pricePerToken = { 
        ...filter.pricePerToken, 
        $lte: parseFloat(req.query.maxPrice as string) 
      };
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Sort options
    let sort: any = { createdAt: -1 };
    if (req.query.sortBy === 'price_asc') sort = { pricePerToken: 1 };
    if (req.query.sortBy === 'price_desc') sort = { pricePerToken: -1 };
    if (req.query.sortBy === 'newest') sort = { createdAt: -1 };
    if (req.query.sortBy === 'oldest') sort = { createdAt: 1 };

    const listings = await MarketplaceListing.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'sellerAddress',
        select: 'name organizationName',
        model: User,
        localField: 'sellerAddress',
        foreignField: 'walletAddress'
      });

    const total = await MarketplaceListing.countDocuments(filter);

    res.json({
      success: true,
      listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get marketplace listings error:', error);
    res.status(500).json({ error: 'Failed to get marketplace listings' });
  }
});

/**
 * @route POST /api/marketplace/purchase
 * @desc Purchase credits from marketplace (Buyer only)
 */
router.post('/purchase', requireBuyer, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listingId, tokenIds } = purchaseListingSchema.parse(req.body);
    
    // Get the listing
    const listing = await MarketplaceListing.findOne({ listingId, isActive: true, isSold: false });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found or no longer available' });
    }

    // Get buyer info
    const buyer = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!buyer || !buyer.isVerified) {
      return res.status(403).json({ error: 'Buyer not verified' });
    }

    // Determine tokens to purchase
    const tokensToTransfer = tokenIds || listing.tokenIds;
    const invalidTokens = tokensToTransfer.filter(id => !listing.tokenIds.includes(id));
    
    if (invalidTokens.length > 0) {
      return res.status(400).json({ 
        error: 'Some tokens are not part of this listing',
        invalidTokens 
      });
    }

    // Calculate price
    const purchasePrice = listing.pricePerToken * tokensToTransfer.length;

    // Note: In a real implementation, you would handle payment here
    // For this MVP, we assume payment is handled off-chain or via smart contract

    // Transfer tokens on blockchain
    const transferPromises = tokensToTransfer.map(tokenId => 
      blockchainService.transferCredit(listing.sellerAddress, buyer.walletAddress, tokenId)
    );
    
    const txHashes = await Promise.all(transferPromises);

    // Update listing
    if (tokensToTransfer.length === listing.tokenIds.length) {
      // Full purchase
      listing.isActive = false;
      listing.isSold = true;
      listing.buyerAddress = buyer.walletAddress;
      listing.soldAt = new Date();
    } else {
      // Partial purchase - remove sold tokens
      listing.tokenIds = listing.tokenIds.filter(id => !tokensToTransfer.includes(id));
      listing.totalPrice = listing.pricePerToken * listing.tokenIds.length;
    }

    await listing.save();

    // Record transactions in database
    for (let i = 0; i < tokensToTransfer.length; i++) {
      await new Transaction({
        transactionHash: txHashes[i],
        blockNumber: await blockchainService.getBlockNumber(),
        tokenId: tokensToTransfer[i],
        fromAddress: listing.sellerAddress,
        toAddress: buyer.walletAddress,
        transactionType: 'TRANSFER',
        amount: 1,
        pricePerToken: listing.pricePerToken,
        totalPrice: listing.pricePerToken,
        cityId: listing.cityId,
        stateId: listing.stateId,
        countryId: listing.countryId,
        timestamp: new Date(),
        metadata: {
          marketplace: {
            listingId,
            pricePerToken: listing.pricePerToken,
            currency: listing.currency
          }
        }
      }).save();
    }

    // Log the purchase
    await new AuditLog({
      action: 'MARKETPLACE_PURCHASE',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      targetAddress: listing.sellerAddress,
      resourceType: 'MARKETPLACE',
      resourceId: listing._id.toString(),
      details: {
        after: {
          listingId,
          tokenIds: tokensToTransfer,
          totalPrice: purchasePrice,
          currency: listing.currency
        },
        metadata: { transactionHashes: txHashes }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();

    res.json({
      success: true,
      message: 'Purchase completed successfully',
      purchase: {
        listingId,
        tokenIds: tokensToTransfer,
        pricePerToken: listing.pricePerToken,
        totalPrice: purchasePrice,
        currency: listing.currency,
        seller: listing.sellerAddress,
        purchasedAt: new Date()
      },
      transactionHashes: txHashes
    });

  } catch (error) {
    console.error('Purchase listing error:', error);
    res.status(500).json({ error: 'Failed to purchase listing' });
  }
});

/**
 * @route POST /api/marketplace/retire/:tokenId
 * @desc Retire a credit (Buyer only)
 */
router.post('/retire/:tokenId', requireBuyer, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);

    // Verify buyer owns the token
    const ownedTokens = await blockchainService.getTokensOfOwner(req.user.walletAddress);
    if (!ownedTokens.includes(tokenId)) {
      return res.status(403).json({ error: 'You do not own this token' });
    }

    // Retire the token on blockchain
    const txHash = await blockchainService.retireCredit(tokenId);

    // Get buyer info for location data
    const buyer = await User.findOne({ walletAddress: req.user.walletAddress });

    // Record retirement transaction
    await new Transaction({
      transactionHash: txHash,
      blockNumber: await blockchainService.getBlockNumber(),
      tokenId,
      fromAddress: req.user.walletAddress,
      toAddress: '0x0000000000000000000000000000000000000000', // Burn address
      transactionType: 'RETIRE',
      amount: 1,
      cityId: buyer?.cityId || 0,
      stateId: buyer?.stateId || 0,
      countryId: buyer?.countryId || 0,
      timestamp: new Date(),
      metadata: {
        retirement: {
          retiredBy: req.user.walletAddress,
          retirementReason: reason
        }
      }
    }).save();

    // Log the retirement
    await new AuditLog({
      action: 'CREDIT_RETIRED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      resourceType: 'TRANSACTION',
      resourceId: tokenId.toString(),
      details: {
        after: {
          tokenId,
          retiredBy: req.user.walletAddress,
          reason
        },
        metadata: { transactionHash: txHash }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      transactionHash: txHash
    }).save();

    res.json({
      success: true,
      message: 'Credit retired successfully',
      retirement: {
        tokenId,
        retiredBy: req.user.walletAddress,
        retiredAt: new Date(),
        reason,
        transactionHash: txHash
      }
    });

  } catch (error) {
    console.error('Retire credit error:', error);
    res.status(500).json({ error: 'Failed to retire credit' });
  }
});

/**
 * @route GET /api/marketplace/my-listings
 * @desc Get user's marketplace listings
 */
router.get('/my-listings', requireProducer, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const listings = await MarketplaceListing.find({ 
      sellerAddress: req.user.walletAddress 
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MarketplaceListing.countDocuments({ 
      sellerAddress: req.user.walletAddress 
    });

    res.json({
      success: true,
      listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(500).json({ error: 'Failed to get listings' });
  }
});

/**
 * @route DELETE /api/marketplace/listings/:listingId
 * @desc Cancel a marketplace listing (Producer only)
 */
router.delete('/listings/:listingId', requireProducer, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listingId } = req.params;

    const listing = await MarketplaceListing.findOne({ 
      listingId,
      sellerAddress: req.user.walletAddress,
      isActive: true,
      isSold: false
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found or not owned by you' });
    }

    // Cancel the listing
    listing.isActive = false;
    await listing.save();

    // Log the cancellation
    await new AuditLog({
      action: 'MARKETPLACE_LISTING_CANCELLED',
      userAddress: req.user.walletAddress,
      userRole: req.user.role,
      resourceType: 'MARKETPLACE',
      resourceId: listing._id.toString(),
      details: {
        before: { isActive: true },
        after: { isActive: false },
        metadata: { listingId, tokenCount: listing.tokenIds.length }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();

    res.json({
      success: true,
      message: 'Listing cancelled successfully',
      listingId
    });

  } catch (error) {
    console.error('Cancel listing error:', error);
    res.status(500).json({ error: 'Failed to cancel listing' });
  }
});

/**
 * @route GET /api/marketplace/my-purchases
 * @desc Get user's purchase history (Buyer only)
 */
router.get('/my-purchases', requireBuyer, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const purchases = await Transaction.find({ 
      toAddress: req.user.walletAddress,
      transactionType: 'TRANSFER'
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments({ 
      toAddress: req.user.walletAddress,
      transactionType: 'TRANSFER'
    });

    res.json({
      success: true,
      purchases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get my purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchase history' });
  }
});

/**
 * @route GET /api/marketplace/stats
 * @desc Get marketplace statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get active listings count
    const activeListings = await MarketplaceListing.countDocuments({ 
      isActive: true, 
      isSold: false 
    });

    // Get total volume traded
    const volumeStats = await Transaction.aggregate([
      { $match: { transactionType: 'TRANSFER', totalPrice: { $exists: true } } },
      {
        $group: {
          _id: null,
          totalVolume: { $sum: '$totalPrice' },
          totalTransactions: { $sum: 1 },
          avgPrice: { $avg: '$pricePerToken' }
        }
      }
    ]);

    // Get price trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const priceTrends = await Transaction.aggregate([
      { 
        $match: { 
          transactionType: 'TRANSFER',
          timestamp: { $gte: thirtyDaysAgo },
          pricePerToken: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          avgPrice: { $avg: '$pricePerToken' },
          volume: { $sum: '$totalPrice' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        activeListings,
        volume: volumeStats[0] || { totalVolume: 0, totalTransactions: 0, avgPrice: 0 },
        priceTrends
      }
    });

  } catch (error) {
    console.error('Get marketplace stats error:', error);
    res.status(500).json({ error: 'Failed to get marketplace statistics' });
  }
});

export default router;