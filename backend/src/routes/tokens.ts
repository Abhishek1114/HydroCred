import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { blockchainService } from '../lib/blockchain';
import { authMiddleware, requireProducerOrBuyer, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route GET /api/tokens/my-tokens
 * @desc Get user's token portfolio
 */
router.get('/my-tokens', requireProducerOrBuyer, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user's tokens from blockchain
    const tokenIds = await blockchainService.getTokensOfOwner(req.user.walletAddress);
    
    // Get token details from transactions (for metadata)
    const tokenDetails = await Promise.all(
      tokenIds.map(async (tokenId) => {
        // Get mint transaction for this token
        const mintTx = await Transaction.findOne({ 
          tokenId, 
          transactionType: 'MINT' 
        });

        // Check if token is retired
        const isRetired = await blockchainService.isTokenRetired(tokenId);

        return {
          tokenId,
          isRetired,
          mintedAt: mintTx?.timestamp,
          cityId: mintTx?.cityId,
          stateId: mintTx?.stateId,
          countryId: mintTx?.countryId,
          metadata: mintTx?.metadata
        };
      })
    );

    // Get token statistics
    const activeTokens = tokenDetails.filter(t => !t.isRetired);
    const retiredTokens = tokenDetails.filter(t => t.isRetired);

    res.json({
      success: true,
      portfolio: {
        totalTokens: tokenIds.length,
        activeTokens: activeTokens.length,
        retiredTokens: retiredTokens.length,
        tokens: tokenDetails
      }
    });

  } catch (error) {
    console.error('Get my tokens error:', error);
    res.status(500).json({ error: 'Failed to get token portfolio' });
  }
});

/**
 * @route GET /api/tokens/:tokenId
 * @desc Get detailed information about a specific token
 */
router.get('/:tokenId', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    
    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }

    // Get token transactions
    const transactions = await Transaction.find({ tokenId })
      .sort({ timestamp: 1 })
      .lean();

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // Get mint transaction (first transaction)
    const mintTx = transactions.find(tx => tx.transactionType === 'MINT');
    
    // Check if token is retired
    const isRetired = await blockchainService.isTokenRetired(tokenId);
    const retirementTx = transactions.find(tx => tx.transactionType === 'RETIRE');

    // Get current owner (last transaction's toAddress, unless retired)
    const currentOwner = isRetired ? 
      retirementTx?.fromAddress : 
      transactions[transactions.length - 1]?.toAddress;

    // Get producer info
    const producer = mintTx ? await User.findOne({ 
      walletAddress: mintTx.fromAddress === '0x0000000000000000000000000000000000000000' ? 
        mintTx.toAddress : mintTx.fromAddress 
    }).select('name organizationName') : null;

    res.json({
      success: true,
      token: {
        tokenId,
        currentOwner,
        isRetired,
        mintedAt: mintTx?.timestamp,
        retiredAt: retirementTx?.timestamp,
        retiredBy: retirementTx?.fromAddress,
        cityId: mintTx?.cityId,
        stateId: mintTx?.stateId,
        countryId: mintTx?.countryId,
        producer: producer ? {
          name: producer.name,
          organizationName: producer.organizationName
        } : null,
        metadata: mintTx?.metadata,
        transactionHistory: transactions
      }
    });

  } catch (error) {
    console.error('Get token details error:', error);
    res.status(500).json({ error: 'Failed to get token details' });
  }
});

/**
 * @route GET /api/tokens/supply
 * @desc Get token supply statistics
 */
router.get('/supply', async (req: Request, res: Response) => {
  try {
    // Get supply from blockchain
    const totalSupply = await blockchainService.getTotalSupply();
    const activeSupply = await blockchainService.getActiveSupply();
    const retiredSupply = totalSupply - activeSupply;

    // Get supply by location from database
    const supplyByLocation = await Transaction.aggregate([
      { $match: { transactionType: 'MINT' } },
      {
        $group: {
          _id: {
            countryId: '$countryId',
            stateId: '$stateId',
            cityId: '$cityId'
          },
          totalMinted: { $sum: 1 }
        }
      },
      { $sort: { totalMinted: -1 } }
    ]);

    // Get retirement statistics
    const retirementStats = await Transaction.aggregate([
      { $match: { transactionType: 'RETIRE' } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          },
          totalRetired: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      supply: {
        total: totalSupply,
        active: activeSupply,
        retired: retiredSupply,
        byLocation: supplyByLocation,
        retirementTrend: retirementStats
      }
    });

  } catch (error) {
    console.error('Get token supply error:', error);
    res.status(500).json({ error: 'Failed to get token supply statistics' });
  }
});

/**
 * @route GET /api/tokens/history/:address
 * @desc Get token transaction history for an address
 */
router.get('/history/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    if (!blockchainService.isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get transactions involving this address
    const transactions = await Transaction.find({
      $or: [
        { fromAddress: address.toLowerCase() },
        { toAddress: address.toLowerCase() }
      ]
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Transaction.countDocuments({
      $or: [
        { fromAddress: address.toLowerCase() },
        { toAddress: address.toLowerCase() }
      ]
    });

    res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get token history error:', error);
    res.status(500).json({ error: 'Failed to get token history' });
  }
});

export default router;