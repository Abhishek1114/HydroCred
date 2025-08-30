import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  transactionHash: string;
  blockNumber: number;
  tokenId: number;
  fromAddress: string;
  toAddress: string;
  transactionType: 'MINT' | 'TRANSFER' | 'RETIRE';
  amount?: number; // For batch operations
  pricePerToken?: number; // ETH price per token
  totalPrice?: number; // Total transaction value
  cityId: number;
  stateId: number;
  countryId: number;
  timestamp: Date;
  gasUsed?: number;
  gasPrice?: string;
  metadata: {
    marketplace?: {
      listingId?: string;
      pricePerToken?: number;
      currency?: string;
    };
    production?: {
      productionDate?: Date;
      facilityName?: string;
      hydrogenAmount?: number;
    };
    retirement?: {
      retiredBy?: string;
      retirementReason?: string;
    };
  };
}

const TransactionSchema = new Schema<ITransaction>({
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  blockNumber: {
    type: Number,
    required: true,
    index: true
  },
  tokenId: {
    type: Number,
    required: true,
    index: true
  },
  fromAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  toAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  transactionType: {
    type: String,
    enum: ['MINT', 'TRANSFER', 'RETIRE'],
    required: true,
    index: true
  },
  amount: Number,
  pricePerToken: Number,
  totalPrice: Number,
  cityId: {
    type: Number,
    required: true,
    index: true
  },
  stateId: {
    type: Number,
    required: true,
    index: true
  },
  countryId: {
    type: Number,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  gasUsed: Number,
  gasPrice: String,
  metadata: {
    marketplace: {
      listingId: String,
      pricePerToken: Number,
      currency: String
    },
    production: {
      productionDate: Date,
      facilityName: String,
      hydrogenAmount: Number
    },
    retirement: {
      retiredBy: String,
      retirementReason: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for analytics queries
TransactionSchema.index({ transactionType: 1, timestamp: -1 });
TransactionSchema.index({ cityId: 1, transactionType: 1, timestamp: -1 });
TransactionSchema.index({ fromAddress: 1, timestamp: -1 });
TransactionSchema.index({ toAddress: 1, timestamp: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);