import mongoose, { Document, Schema } from 'mongoose';

export interface IProductionRequest extends Document {
  requestId: string;
  requestHash: string;
  producerAddress: string;
  cityId: number;
  stateId: number;
  countryId: number;
  hydrogenAmount: number; // kg of H2
  productionDate: Date;
  productionMethod: string;
  energySource: string;
  certificationDocuments: string[]; // File paths
  status: 'PENDING' | 'CERTIFIED' | 'REJECTED' | 'ISSUED';
  certifiedBy?: string; // City Admin wallet address
  certifiedAt?: Date;
  rejectionReason?: string;
  tokensIssued?: number[];
  issuedAt?: Date;
  metadata: {
    facilityName?: string;
    facilityLocation?: string;
    productionEfficiency?: number;
    carbonIntensity?: number; // kg CO2/kg H2
    verificationMethod?: string;
    qualityMetrics?: {
      purity?: number;
      pressure?: number;
      temperature?: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProductionRequestSchema = new Schema<IProductionRequest>({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  requestHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  producerAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
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
  hydrogenAmount: {
    type: Number,
    required: true,
    min: 0.01,
    max: 1000
  },
  productionDate: {
    type: Date,
    required: true,
    index: true
  },
  productionMethod: {
    type: String,
    required: true,
    enum: ['ELECTROLYSIS', 'STEAM_REFORMING', 'BIOMASS_GASIFICATION', 'OTHER']
  },
  energySource: {
    type: String,
    required: true,
    enum: ['SOLAR', 'WIND', 'HYDRO', 'GEOTHERMAL', 'NUCLEAR', 'MIXED_RENEWABLE', 'OTHER']
  },
  certificationDocuments: [String],
  status: {
    type: String,
    enum: ['PENDING', 'CERTIFIED', 'REJECTED', 'ISSUED'],
    default: 'PENDING',
    index: true
  },
  certifiedBy: {
    type: String,
    lowercase: true
  },
  certifiedAt: Date,
  rejectionReason: String,
  tokensIssued: [Number],
  issuedAt: Date,
  metadata: {
    facilityName: String,
    facilityLocation: String,
    productionEfficiency: Number,
    carbonIntensity: Number,
    verificationMethod: String,
    qualityMetrics: {
      purity: Number,
      pressure: Number,
      temperature: Number
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
ProductionRequestSchema.index({ producerAddress: 1, status: 1 });
ProductionRequestSchema.index({ cityId: 1, status: 1 });
ProductionRequestSchema.index({ status: 1, createdAt: -1 });
ProductionRequestSchema.index({ productionDate: -1, status: 1 });

export const ProductionRequest = mongoose.model<IProductionRequest>('ProductionRequest', ProductionRequestSchema);