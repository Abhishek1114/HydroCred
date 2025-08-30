import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5055/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hydrocred_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hydrocred_token');
      localStorage.removeItem('hydrocred_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  walletAddress: string;
  role: string;
  isVerified: boolean;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  name?: string;
  organizationName?: string;
  email?: string;
  registeredAt?: string;
  lastLogin?: string;
}

export interface ProductionRequest {
  requestId: string;
  requestHash: string;
  producerAddress: string;
  cityId: number;
  stateId: number;
  countryId: number;
  hydrogenAmount: number;
  productionDate: string;
  productionMethod: string;
  energySource: string;
  status: 'PENDING' | 'CERTIFIED' | 'REJECTED' | 'ISSUED';
  certifiedBy?: string;
  certifiedAt?: string;
  rejectionReason?: string;
  tokensIssued?: number[];
  metadata?: any;
  createdAt: string;
}

export interface MarketplaceListing {
  listingId: string;
  sellerAddress: string;
  tokenIds: number[];
  pricePerToken: number;
  totalPrice: number;
  currency: string;
  isActive: boolean;
  isSold: boolean;
  buyerAddress?: string;
  soldAt?: string;
  cityId: number;
  stateId: number;
  countryId: number;
  metadata?: any;
  createdAt: string;
}

export interface Transaction {
  transactionHash: string;
  blockNumber: number;
  tokenId: number;
  fromAddress: string;
  toAddress: string;
  transactionType: 'MINT' | 'TRANSFER' | 'RETIRE';
  amount?: number;
  pricePerToken?: number;
  totalPrice?: number;
  timestamp: string;
  metadata?: any;
}

// Auth API
export const authAPI = {
  connect: async (walletAddress: string, signature: string, message: string) => {
    const response = await api.post('/auth/connect', {
      walletAddress,
      signature,
      message
    });
    return response.data;
  },

  requestRole: async (data: {
    walletAddress: string;
    role: 'PRODUCER' | 'BUYER';
    name?: string;
    organizationName?: string;
    email?: string;
    cityId?: number;
    metadata?: any;
  }) => {
    const response = await api.post('/auth/request-role', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  }
};

// Admin API
export const adminAPI = {
  appointCountryAdmin: async (data: {
    adminAddress: string;
    name?: string;
    organizationName?: string;
    email?: string;
  }) => {
    const response = await api.post('/admin/appoint-country-admin', data);
    return response.data;
  },

  appointStateAdmin: async (data: {
    adminAddress: string;
    countryId: number;
    name?: string;
    organizationName?: string;
    email?: string;
  }) => {
    const response = await api.post('/admin/appoint-state-admin', data);
    return response.data;
  },

  appointCityAdmin: async (data: {
    adminAddress: string;
    stateId: number;
    name?: string;
    organizationName?: string;
    email?: string;
  }) => {
    const response = await api.post('/admin/appoint-city-admin', data);
    return response.data;
  },

  approveProducer: async (data: {
    producerAddress: string;
    cityId: number;
  }) => {
    const response = await api.post('/admin/approve-producer', data);
    return response.data;
  },

  getPendingApprovals: async () => {
    const response = await api.get('/admin/pending-approvals');
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },

  getUsers: async (page = 1, limit = 20) => {
    const response = await api.get(`/admin/users?page=${page}&limit=${limit}`);
    return response.data;
  }
};

// Production API
export const productionAPI = {
  submitRequest: async (data: FormData) => {
    const response = await api.post('/production/submit', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  certifyRequest: async (requestId: string) => {
    const response = await api.post(`/production/certify/${requestId}`);
    return response.data;
  },

  issueCredits: async (requestId: string) => {
    const response = await api.post(`/production/issue/${requestId}`);
    return response.data;
  },

  rejectRequest: async (requestId: string, reason: string) => {
    const response = await api.post(`/production/reject/${requestId}`, { reason });
    return response.data;
  },

  getRequests: async (params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}) => {
    const response = await api.get('/production/requests', { params });
    return response.data;
  },

  getRequest: async (requestId: string) => {
    const response = await api.get(`/production/requests/${requestId}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/production/stats');
    return response.data;
  }
};

// Marketplace API
export const marketplaceAPI = {
  createListing: async (data: {
    tokenIds: number[];
    pricePerToken: number;
    currency?: string;
    metadata?: any;
  }) => {
    const response = await api.post('/marketplace/list', data);
    return response.data;
  },

  getListings: async (params: {
    page?: number;
    limit?: number;
    cityId?: number;
    stateId?: number;
    countryId?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
  } = {}) => {
    const response = await api.get('/marketplace/listings', { params });
    return response.data;
  },

  purchaseListing: async (data: {
    listingId: string;
    tokenIds?: number[];
  }) => {
    const response = await api.post('/marketplace/purchase', data);
    return response.data;
  },

  getMyListings: async (page = 1, limit = 20) => {
    const response = await api.get(`/marketplace/my-listings?page=${page}&limit=${limit}`);
    return response.data;
  },

  getMyPurchases: async (page = 1, limit = 20) => {
    const response = await api.get(`/marketplace/my-purchases?page=${page}&limit=${limit}`);
    return response.data;
  },

  cancelListing: async (listingId: string) => {
    const response = await api.delete(`/marketplace/listings/${listingId}`);
    return response.data;
  },

  retireCredit: async (tokenId: number, reason?: string) => {
    const response = await api.post(`/marketplace/retire/${tokenId}`, { reason });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/marketplace/stats');
    return response.data;
  }
};

// Tokens API
export const tokensAPI = {
  getMyTokens: async () => {
    const response = await api.get('/tokens/my-tokens');
    return response.data;
  },

  getTokenDetails: async (tokenId: number) => {
    const response = await api.get(`/tokens/${tokenId}`);
    return response.data;
  },

  getSupplyStats: async () => {
    const response = await api.get('/tokens/supply');
    return response.data;
  },

  getTokenHistory: async (address: string, page = 1, limit = 20) => {
    const response = await api.get(`/tokens/history/${address}?page=${page}&limit=${limit}`);
    return response.data;
  }
};

// Audit API
export const auditAPI = {
  exportData: async (params: {
    format?: 'json' | 'csv';
    startDate?: string;
    endDate?: string;
    type?: 'transactions' | 'production' | 'audit' | 'all';
    cityId?: number;
    stateId?: number;
    countryId?: number;
  } = {}) => {
    const response = await api.get('/audit/export', { params });
    return response.data;
  },

  getLogs: async (params: {
    page?: number;
    limit?: number;
    action?: string;
    resourceType?: string;
    userAddress?: string;
  } = {}) => {
    const response = await api.get('/audit/logs', { params });
    return response.data;
  },

  getTransactions: async (params: {
    page?: number;
    limit?: number;
    type?: string;
    fromAddress?: string;
    toAddress?: string;
    tokenId?: number;
  } = {}) => {
    const response = await api.get('/audit/transactions', { params });
    return response.data;
  }
};

// System API
export const systemAPI = {
  getHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/status');
    return response.data;
  }
};

export default api;