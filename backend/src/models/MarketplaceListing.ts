import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketplaceListing extends Document {
  listingId: string;
  sellerAddress: string;
  tokenIds: number[];
  pricePerToken: number; // ETH price per token
  totalPrice: number;
  currency: string;
  isActive: boolean;
  isSold: boolean;
  buyerAddress?: string;
  soldAt?: Date;
  cityId: number;
  stateId: number;
  countryId: number;
  metadata: {
    title?: string;
    description?: string;
    productionDate?: Date;
    facilityName?: string;
    hydrogenQuality?: {
      purity?: number;
      carbonIntensity?: number;
    };
    certificationLevel?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MarketplaceListingSchema = new Schema<IMarketplaceListing>({
  listingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  sellerAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  tokenIds: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v: number[]) {
        return v.length > 0 && v.length <= 100;
      },
      message: 'Must have between 1 and 100 tokens'
    }
  },
  pricePerToken: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'ETH',
    enum: ['ETH', 'MATIC', 'USD']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isSold: {
    type: Boolean,
    default: false,
    index: true
  },
  buyerAddress: {
    type: String,
    lowercase: true
  },
  soldAt: Date,
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
  metadata: {
    title: String,
    description: String,
    productionDate: Date,
    facilityName: String,
    hydrogenQuality: {
      purity: Number,
      carbonIntensity: Number
    },
    certificationLevel: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for marketplace queries
MarketplaceListingSchema.index({ isActive: 1, pricePerToken: 1 });
MarketplaceListingSchema.index({ cityId: 1, isActive: 1 });
MarketplaceListingSchema.index({ sellerAddress: 1, isActive: 1 });
MarketplaceListingSchema.index({ createdAt: -1, isActive: 1 });

export const MarketplaceListing = mongoose.model<IMarketplaceListing>('MarketplaceListing', MarketplaceListingSchema);