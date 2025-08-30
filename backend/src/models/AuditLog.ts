import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  userAddress: string;
  userRole: string;
  targetAddress?: string;
  resourceType: 'USER' | 'PRODUCTION_REQUEST' | 'TRANSACTION' | 'MARKETPLACE' | 'ROLE' | 'CONTRACT';
  resourceId?: string;
  details: {
    before?: any;
    after?: any;
    metadata?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  blockNumber?: number;
  transactionHash?: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
  action: {
    type: String,
    required: true,
    index: true
  },
  userAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  userRole: {
    type: String,
    required: true,
    index: true
  },
  targetAddress: {
    type: String,
    lowercase: true
  },
  resourceType: {
    type: String,
    enum: ['USER', 'PRODUCTION_REQUEST', 'TRANSACTION', 'MARKETPLACE', 'ROLE', 'CONTRACT'],
    required: true,
    index: true
  },
  resourceId: String,
  details: {
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  blockNumber: Number,
  transactionHash: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for audit queries
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ userAddress: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);