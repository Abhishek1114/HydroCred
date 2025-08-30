import { hash } from './crypto';

export interface CreditListing {
  id: string;
  sellerWallet: string;
  sellerName: string;
  tokenIds: number[]; // Array of token IDs being sold
  pricePerCredit: number; // Price per credit in USD
  totalPrice: number; // Total price for all credits
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  buyerWallet?: string;
  soldAt?: Date;
  transactionHash?: string;
}

export interface CreditTransaction {
  id: string;
  listingId: string;
  sellerWallet: string;
  buyerWallet: string;
  tokenIds: number[];
  totalPrice: number;
  transactionHash: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  blockchainTxHash?: string;
}

export interface CreditRetirement {
  id: string;
  ownerWallet: string;
  tokenIds: number[];
  retirementReason: string;
  retirementDate: Date;
  blockchainTxHash?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

// In-memory storage (replace with MongoDB in production)
const creditListings = new Map<string, CreditListing>();
const creditTransactions = new Map<string, CreditTransaction>();
const creditRetirements = new Map<string, CreditRetirement>();

export class MarketplaceManager {
  static async createListing(listingData: Omit<CreditListing, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'expiresAt'>): Promise<CreditListing> {
    const id = hash(listingData.sellerWallet + Date.now().toString());
    
    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const listing: CreditListing = {
      ...listingData,
      id,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt
    };
    
    creditListings.set(id, listing);
    return listing;
  }
  
  static async getListing(id: string): Promise<CreditListing | null> {
    return creditListings.get(id) || null;
  }
  
  static async getActiveListings(): Promise<CreditListing[]> {
    const now = new Date();
    return Array.from(creditListings.values())
      .filter(listing => 
        listing.status === 'active' && 
        listing.expiresAt > now
      );
  }
  
  static async getListingsBySeller(sellerWallet: string): Promise<CreditListing[]> {
    return Array.from(creditListings.values())
      .filter(listing => listing.sellerWallet.toLowerCase() === sellerWallet.toLowerCase());
  }
  
  static async getListingsByPriceRange(minPrice: number, maxPrice: number): Promise<CreditListing[]> {
    return Array.from(creditListings.values())
      .filter(listing => 
        listing.status === 'active' &&
        listing.pricePerCredit >= minPrice &&
        listing.pricePerCredit <= maxPrice
      );
  }
  
  static async purchaseCredits(listingId: string, buyerWallet: string): Promise<CreditTransaction | null> {
    const listing = creditListings.get(listingId);
    if (!listing || listing.status !== 'active') return null;
    
    // Check if listing has expired
    if (listing.expiresAt < new Date()) {
      listing.status = 'expired';
      listing.updatedAt = new Date();
      creditListings.set(listingId, listing);
      return null;
    }
    
    // Create transaction
    const transactionId = hash(listingId + buyerWallet + Date.now().toString());
    const transaction: CreditTransaction = {
      id: transactionId,
      listingId,
      sellerWallet: listing.sellerWallet,
      buyerWallet,
      tokenIds: listing.tokenIds,
      totalPrice: listing.totalPrice,
      transactionHash: hash(transactionId + Date.now().toString()),
      status: 'pending',
      createdAt: new Date()
    };
    
    // Update listing
    listing.status = 'sold';
    listing.buyerWallet = buyerWallet;
    listing.soldAt = new Date();
    listing.updatedAt = new Date();
    
    creditListings.set(listingId, listing);
    creditTransactions.set(transactionId, transaction);
    
    return transaction;
  }
  
  static async completeTransaction(transactionId: string, blockchainTxHash: string): Promise<boolean> {
    const transaction = creditTransactions.get(transactionId);
    if (!transaction || transaction.status !== 'pending') return false;
    
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    transaction.blockchainTxHash = blockchainTxHash;
    
    creditTransactions.set(transactionId, transaction);
    return true;
  }
  
  static async cancelListing(listingId: string, sellerWallet: string): Promise<boolean> {
    const listing = creditListings.get(listingId);
    if (!listing || listing.sellerWallet.toLowerCase() !== sellerWallet.toLowerCase()) return false;
    
    listing.status = 'cancelled';
    listing.updatedAt = new Date();
    
    creditListings.set(listingId, listing);
    return true;
  }
  
  static async retireCredits(ownerWallet: string, tokenIds: number[], reason: string): Promise<CreditRetirement> {
    const id = hash(ownerWallet + tokenIds.join(',') + Date.now().toString());
    
    const retirement: CreditRetirement = {
      id,
      ownerWallet,
      tokenIds,
      retirementReason: reason,
      retirementDate: new Date(),
      verified: false
    };
    
    creditRetirements.set(id, retirement);
    return retirement;
  }
  
  static async verifyRetirement(retirementId: string, verifierWallet: string): Promise<boolean> {
    const retirement = creditRetirements.get(retirementId);
    if (!retirement) return false;
    
    retirement.verified = true;
    retirement.verifiedBy = verifierWallet;
    retirement.verifiedAt = new Date();
    
    creditRetirements.set(retirementId, retirement);
    return true;
  }
  
  static async getRetirementsByOwner(ownerWallet: string): Promise<CreditRetirement[]> {
    return Array.from(creditRetirements.values())
      .filter(retirement => retirement.ownerWallet.toLowerCase() === ownerWallet.toLowerCase());
  }
  
  static async getMarketplaceStats(): Promise<{
    totalListings: number;
    activeListings: number;
    totalTransactions: number;
    totalVolume: number;
    averagePrice: number;
  }> {
    const listings = Array.from(creditListings.values());
    const transactions = Array.from(creditTransactions.values());
    
    const activeListings = listings.filter(l => l.status === 'active');
    const completedTransactions = transactions.filter(t => t.status === 'completed');
    
    const totalVolume = completedTransactions.reduce((sum, t) => sum + t.totalPrice, 0);
    const averagePrice = activeListings.length > 0 
      ? activeListings.reduce((sum, l) => sum + l.pricePerCredit, 0) / activeListings.length
      : 0;
    
    return {
      totalListings: listings.length,
      activeListings: activeListings.length,
      totalTransactions: completedTransactions.length,
      totalVolume,
      averagePrice
    };
  }
  
  static async searchListings(query: string): Promise<CreditListing[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(creditListings.values())
      .filter(listing => 
        listing.status === 'active' &&
        (listing.sellerName.toLowerCase().includes(searchTerm) ||
         listing.sellerWallet.toLowerCase().includes(searchTerm))
      );
  }
}
