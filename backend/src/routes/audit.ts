import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { ProductionRequest } from '../models/ProductionRequest';
import { Transaction } from '../models/Transaction';
import { AuditLog } from '../models/AuditLog';
import { authMiddleware, requireAuditor, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation schemas
const exportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(['transactions', 'production', 'audit', 'all']).default('all'),
  cityId: z.number().optional(),
  stateId: z.number().optional(),
  countryId: z.number().optional()
});

/**
 * @route GET /api/audit/export
 * @desc Export audit data (Auditor/Admin access only)
 */
router.get('/export', requireAuditor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = exportSchema.parse(req.query);
    
    // Get user info for jurisdiction filtering
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build date filter
    let dateFilter: any = {};
    if (query.startDate) {
      dateFilter.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      dateFilter.$lte = new Date(query.endDate);
    }

    // Build jurisdiction filter based on user role
    let jurisdictionFilter: any = {};
    if (user.role !== 'MAIN_ADMIN' && user.role !== 'AUDITOR') {
      switch (user.role) {
        case 'CITY_ADMIN':
          jurisdictionFilter.cityId = user.cityId;
          break;
        case 'STATE_ADMIN':
          jurisdictionFilter.stateId = user.stateId;
          break;
        case 'COUNTRY_ADMIN':
          jurisdictionFilter.countryId = user.countryId;
          break;
      }
    }

    // Override with query parameters if provided
    if (query.cityId) jurisdictionFilter.cityId = query.cityId;
    if (query.stateId) jurisdictionFilter.stateId = query.stateId;
    if (query.countryId) jurisdictionFilter.countryId = query.countryId;

    let exportData: any = {};

    // Export transactions
    if (query.type === 'transactions' || query.type === 'all') {
      const transactionFilter = {
        ...jurisdictionFilter,
        ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter })
      };

      exportData.transactions = await Transaction.find(transactionFilter)
        .sort({ timestamp: -1 })
        .limit(10000) // Limit for performance
        .lean();
    }

    // Export production requests
    if (query.type === 'production' || query.type === 'all') {
      const productionFilter = {
        ...jurisdictionFilter,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      };

      exportData.productionRequests = await ProductionRequest.find(productionFilter)
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean();
    }

    // Export audit logs
    if (query.type === 'audit' || query.type === 'all') {
      const auditFilter = {
        ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter })
      };

      // For audit logs, filter by user's jurisdiction if not main admin/auditor
      if (user.role !== 'MAIN_ADMIN' && user.role !== 'AUDITOR') {
        // Only show actions within their jurisdiction
        const jurisdictionUsers = await User.find(jurisdictionFilter).select('walletAddress');
        const jurisdictionAddresses = jurisdictionUsers.map(u => u.walletAddress);
        auditFilter.userAddress = { $in: jurisdictionAddresses };
      }

      exportData.auditLogs = await AuditLog.find(auditFilter)
        .sort({ timestamp: -1 })
        .limit(10000)
        .lean();
    }

    // Format response based on requested format
    if (query.format === 'csv') {
      // Convert to CSV format
      let csvContent = '';
      
      if (exportData.transactions) {
        csvContent += 'TRANSACTIONS\n';
        csvContent += 'Hash,Block,TokenId,From,To,Type,Amount,Price,City,State,Country,Timestamp\n';
        exportData.transactions.forEach((tx: any) => {
          csvContent += `${tx.transactionHash},${tx.blockNumber},${tx.tokenId},${tx.fromAddress},${tx.toAddress},${tx.transactionType},${tx.amount || ''},${tx.pricePerToken || ''},${tx.cityId},${tx.stateId},${tx.countryId},${tx.timestamp}\n`;
        });
        csvContent += '\n';
      }

      if (exportData.productionRequests) {
        csvContent += 'PRODUCTION REQUESTS\n';
        csvContent += 'RequestId,Producer,Amount,Date,Method,Source,Status,City,State,Country,Created\n';
        exportData.productionRequests.forEach((req: any) => {
          csvContent += `${req.requestId},${req.producerAddress},${req.hydrogenAmount},${req.productionDate},${req.productionMethod},${req.energySource},${req.status},${req.cityId},${req.stateId},${req.countryId},${req.createdAt}\n`;
        });
        csvContent += '\n';
      }

      if (exportData.auditLogs) {
        csvContent += 'AUDIT LOGS\n';
        csvContent += 'Action,User,Role,Target,Resource,Timestamp\n';
        exportData.auditLogs.forEach((log: any) => {
          csvContent += `${log.action},${log.userAddress},${log.userRole},${log.targetAddress || ''},${log.resourceType},${log.timestamp}\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=hydrocred-audit-${Date.now()}.csv`);
      res.send(csvContent);
    } else {
      // JSON format
      res.json({
        success: true,
        exportData,
        metadata: {
          exportedAt: new Date(),
          exportedBy: req.user.walletAddress,
          format: query.format,
          type: query.type,
          filters: {
            dateRange: Object.keys(dateFilter).length > 0 ? dateFilter : null,
            jurisdiction: Object.keys(jurisdictionFilter).length > 0 ? jurisdictionFilter : null
          }
        }
      });
    }

  } catch (error) {
    console.error('Export audit data error:', error);
    res.status(500).json({ error: 'Failed to export audit data' });
  }
});

/**
 * @route GET /api/audit/logs
 * @desc Get audit logs (Auditor/Admin access only)
 */
router.get('/logs', requireAuditor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let filter: any = {};

    // Apply jurisdiction filtering for non-main admins
    if (user.role !== 'MAIN_ADMIN' && user.role !== 'AUDITOR') {
      const jurisdictionFilter: any = {};
      
      switch (user.role) {
        case 'CITY_ADMIN':
          jurisdictionFilter.cityId = user.cityId;
          break;
        case 'STATE_ADMIN':
          jurisdictionFilter.stateId = user.stateId;
          break;
        case 'COUNTRY_ADMIN':
          jurisdictionFilter.countryId = user.countryId;
          break;
      }

      // Get users in jurisdiction
      const jurisdictionUsers = await User.find(jurisdictionFilter).select('walletAddress');
      const jurisdictionAddresses = jurisdictionUsers.map(u => u.walletAddress);
      filter.userAddress = { $in: jurisdictionAddresses };
    }

    // Add additional filters
    if (req.query.action) filter.action = req.query.action;
    if (req.query.resourceType) filter.resourceType = req.query.resourceType;
    if (req.query.userAddress) filter.userAddress = req.query.userAddress;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

/**
 * @route GET /api/audit/transactions
 * @desc Get transaction history (Auditor/Admin access only)
 */
router.get('/transactions', requireAuditor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let filter: any = {};

    // Apply jurisdiction filtering for non-main admins
    if (user.role !== 'MAIN_ADMIN' && user.role !== 'AUDITOR') {
      switch (user.role) {
        case 'CITY_ADMIN':
          filter.cityId = user.cityId;
          break;
        case 'STATE_ADMIN':
          filter.stateId = user.stateId;
          break;
        case 'COUNTRY_ADMIN':
          filter.countryId = user.countryId;
          break;
      }
    }

    // Add additional filters
    if (req.query.type) filter.transactionType = req.query.type;
    if (req.query.fromAddress) filter.fromAddress = req.query.fromAddress;
    if (req.query.toAddress) filter.toAddress = req.query.toAddress;
    if (req.query.tokenId) filter.tokenId = parseInt(req.query.tokenId as string);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Transaction.countDocuments(filter);

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
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

export default router;