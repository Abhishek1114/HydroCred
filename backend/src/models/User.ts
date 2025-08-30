import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  role: 'MAIN_ADMIN' | 'COUNTRY_ADMIN' | 'STATE_ADMIN' | 'CITY_ADMIN' | 'PRODUCER' | 'BUYER' | 'AUDITOR';
  email?: string;
  name?: string;
  organizationName?: string;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  isActive: boolean;
  isVerified: boolean;
  registeredAt: Date;
  lastLogin?: Date;
  metadata?: {
    licenseNumber?: string;
    certifications?: string[];
    contactInfo?: {
      phone?: string;
      address?: string;
    };
  };
}

const UserSchema = new Schema<IUser>({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  role: {
    type: String,
    enum: ['MAIN_ADMIN', 'COUNTRY_ADMIN', 'STATE_ADMIN', 'CITY_ADMIN', 'PRODUCER', 'BUYER', 'AUDITOR'],
    required: true,
    index: true
  },
  email: {
    type: String,
    lowercase: true,
    sparse: true
  },
  name: String,
  organizationName: String,
  countryId: {
    type: Number,
    index: true
  },
  stateId: {
    type: Number,
    index: true
  },
  cityId: {
    type: Number,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  registeredAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastLogin: Date,
  metadata: {
    licenseNumber: String,
    certifications: [String],
    contactInfo: {
      phone: String,
      address: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
UserSchema.index({ walletAddress: 1, role: 1 });
UserSchema.index({ countryId: 1, stateId: 1, cityId: 1 });
UserSchema.index({ isActive: 1, isVerified: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);