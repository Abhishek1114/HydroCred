import { BACKEND_URL } from './chain';

export interface User {
  id: string;
  walletAddress: string;
  role: string;
  name: string;
  email?: string;
  organization: string;
  location: {
    country: string;
    state: string;
    city: string;
  };
  status: string;
  verifiedAt?: string;
}

export interface ProductionRequest {
  id: string;
  producerWallet: string;
  producerName: string;
  organization: string;
  location: {
    country: string;
    state: string;
    city: string;
  };
  productionData: {
    hydrogenAmount: number;
    productionDate: string;
    energySource: string;
    energySourceDetails: string;
    carbonFootprint: number;
    certificationDocuments: string[];
  };
  status: string;
  certifiedBy?: string;
  certifiedAt?: string;
  rejectionReason?: string;
  creditsIssued?: number;
  blockchainTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditListing {
  id: string;
  sellerWallet: string;
  sellerName: string;
  tokenIds: number[];
  pricePerCredit: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  buyerWallet?: string;
  soldAt?: string;
  transactionHash?: string;
}

export interface MarketplaceStats {
  totalListings: number;
  activeListings: number;
  totalTransactions: number;
  totalVolume: number;
  averagePrice: number;
}

export interface ProductionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  certified: number;
  totalCreditsIssued: number;
}

export interface UserStats {
  total: number;
  byRole: Record<string, number>;
}

export interface Analytics {
  users: UserStats;
  production: ProductionStats;
  marketplace: MarketplaceStats;
}
export interface CreditEvent {
  type: 'issued' | 'transferred' | 'retired';
  to: string;
  from?: string;
  amount: number;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  fromId: number;
  toId: number;
  tokenId?: number; // Optional for individual token operations
}


class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // User Management
  async registerUser(userData: {
    walletAddress: string;
    role: string;
    name: string;
    email?: string;
    organization: string;
    location: {
      country: string;
      state: string;
      city: string;
    };
  }): Promise<{ success: boolean; user: User }> {
    return this.request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUser(walletAddress: string): Promise<{ success: boolean; user: User }> {
    return this.request(`/api/users/${walletAddress}`);
  }

  // Production Requests
  async createProductionRequest(requestData: {
    producerWallet: string;
    producerName: string;
    organization: string;
    location: {
      country: string;
      state: string;
      city: string;
    };
    productionData: {
      hydrogenAmount: number;
      productionDate: string;
      energySource: string;
      energySourceDetails: string;
      carbonFootprint: number;
      certificationDocuments: string[];
    };
  }): Promise<{ success: boolean; request: ProductionRequest }> {
    return this.request('/api/production/request', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async getProductionRequests(params?: {
    status?: string;
    producer?: string;
    country?: string;
    state?: string;
    city?: string;
  }): Promise<{ success: boolean; requests: ProductionRequest[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.producer) queryParams.append('producer', params.producer);
    if (params?.country) queryParams.append('country', params.country);
    if (params?.state) queryParams.append('state', params.state);
    if (params?.city) queryParams.append('city', params.city);

    const endpoint = `/api/production/requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async approveProductionRequest(
    requestId: string,
    certifierWallet: string,
    creditsToIssue: number
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/production/approve/${requestId}`, {
      method: 'POST',
      body: JSON.stringify({ certifierWallet, creditsToIssue }),
    });
  }

  // Marketplace
  async getMarketplaceListings(params?: {
    minPrice?: number;
    maxPrice?: number;
    seller?: string;
    search?: string;
  }): Promise<{ success: boolean; listings: CreditListing[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params?.minPrice) queryParams.append('minPrice', params.minPrice.toString());
    if (params?.maxPrice) queryParams.append('maxPrice', params.maxPrice.toString());
    if (params?.seller) queryParams.append('seller', params.seller);
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = `/api/marketplace/listings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createMarketplaceListing(listingData: {
    sellerWallet: string;
    sellerName: string;
    tokenIds: number[];
    pricePerCredit: number;
    totalPrice: number;
  }): Promise<{ success: boolean; listing: CreditListing }> {
    return this.request('/api/marketplace/listing', {
      method: 'POST',
      body: JSON.stringify(listingData),
    });
  }

  async purchaseCredits(
    listingId: string,
    buyerWallet: string
  ): Promise<{ success: boolean; transaction: any }> {
    return this.request(`/api/marketplace/purchase/${listingId}`, {
      method: 'POST',
      body: JSON.stringify({ buyerWallet }),
    });
  }

  // Analytics
  async getAnalytics(): Promise<{ success: boolean; analytics: Analytics }> {
    return this.request('/api/analytics/overview');
  }

  // Audit
  async exportAuditData(format: 'json' | 'csv' = 'json'): Promise<any> {
    return this.request(`/api/audit/export?format=${format}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    return this.request('/api/health');
  }

  // Initialize admin
  async initializeAdmin(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/init');
  }

  // File upload
  async uploadFile(file: File): Promise<{ success: boolean; file: any }> {
    const formData = new FormData();
    formData.append('document', file);

    const url = `${this.baseUrl}/api/upload`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }
    async getLedgerData(): Promise<{ events: CreditEvent[] }> {
    return this.request('/api/ledger');
  }
}

export const apiClient = new ApiClient();
export default apiClient;