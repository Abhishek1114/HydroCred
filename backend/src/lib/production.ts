import { hash } from './crypto';
import { UserRole } from './users';

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
    hydrogenAmount: number; // in kg
    productionDate: Date;
    energySource: string; // e.g., "Solar", "Wind", "Nuclear"
    energySourceDetails: string;
    carbonFootprint: number; // kg CO2 equivalent
    certificationDocuments: string[]; // Array of document hashes
  };
  status: 'pending' | 'approved' | 'rejected' | 'certified';
  certifiedBy?: string; // Admin wallet address
  certifiedAt?: Date;
  rejectionReason?: string;
  creditsIssued?: number;
  blockchainTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificationDocument {
  id: string;
  requestId: string;
  filename: string;
  originalName: string;
  fileHash: string;
  uploadedAt: Date;
  verified: boolean;
}

// In-memory storage (replace with MongoDB in production)
const productionRequests = new Map<string, ProductionRequest>();
const certificationDocuments = new Map<string, CertificationDocument>();

export class ProductionManager {
  static async createProductionRequest(requestData: Omit<ProductionRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ProductionRequest> {
    const id = hash(requestData.producerWallet + Date.now().toString());
    
    const request: ProductionRequest = {
      ...requestData,
      id,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    productionRequests.set(id, request);
    return request;
  }
  
  static async getProductionRequest(id: string): Promise<ProductionRequest | null> {
    return productionRequests.get(id) || null;
  }
  
  static async getProductionRequestsByProducer(producerWallet: string): Promise<ProductionRequest[]> {
    return Array.from(productionRequests.values())
      .filter(request => request.producerWallet.toLowerCase() === producerWallet.toLowerCase());
  }
  
  static async getPendingRequests(): Promise<ProductionRequest[]> {
    return Array.from(productionRequests.values())
      .filter(request => request.status === 'pending');
  }
  
  static async getRequestsByStatus(status: ProductionRequest['status']): Promise<ProductionRequest[]> {
    return Array.from(productionRequests.values())
      .filter(request => request.status === status);
  }
  
  static async getRequestsByLocation(country?: string, state?: string, city?: string): Promise<ProductionRequest[]> {
    return Array.from(productionRequests.values()).filter(request => {
      if (country && request.location.country !== country) return false;
      if (state && request.location.state !== state) return false;
      if (city && request.location.city !== city) return false;
      return true;
    });
  }
  
  static async approveRequest(requestId: string, certifierWallet: string, creditsToIssue: number): Promise<boolean> {
    const request = productionRequests.get(requestId);
    if (!request || request.status !== 'pending') return false;
    
    request.status = 'approved';
    request.certifiedBy = certifierWallet;
    request.certifiedAt = new Date();
    request.creditsIssued = creditsToIssue;
    request.updatedAt = new Date();
    
    productionRequests.set(requestId, request);
    return true;
  }
  
  static async rejectRequest(requestId: string, certifierWallet: string, reason: string): Promise<boolean> {
    const request = productionRequests.get(requestId);
    if (!request || request.status !== 'pending') return false;
    
    request.status = 'rejected';
    request.certifiedBy = certifierWallet;
    request.certifiedAt = new Date();
    request.rejectionReason = reason;
    request.updatedAt = new Date();
    
    productionRequests.set(requestId, request);
    return true;
  }
  
  static async markAsCertified(requestId: string, blockchainTxHash: string): Promise<boolean> {
    const request = productionRequests.get(requestId);
    if (!request || request.status !== 'approved') return false;
    
    request.status = 'certified';
    request.blockchainTxHash = blockchainTxHash;
    request.updatedAt = new Date();
    
    productionRequests.set(requestId, request);
    return true;
  }
  
  static async addCertificationDocument(requestId: string, documentData: Omit<CertificationDocument, 'id' | 'uploadedAt' | 'verified'>): Promise<CertificationDocument> {
    const id = hash(documentData.filename + Date.now().toString());
    
    const document: CertificationDocument = {
      ...documentData,
      id,
      uploadedAt: new Date(),
      verified: false
    };
    
    certificationDocuments.set(id, document);
    
    // Add document hash to production request
    const request = productionRequests.get(requestId);
    if (request) {
      request.productionData.certificationDocuments.push(document.fileHash);
      request.updatedAt = new Date();
      productionRequests.set(requestId, request);
    }
    
    return document;
  }
  
  static async verifyDocument(documentId: string): Promise<boolean> {
    const document = certificationDocuments.get(documentId);
    if (!document) return false;
    
    document.verified = true;
    certificationDocuments.set(documentId, document);
    return true;
  }
  
  static async getAllRequests(): Promise<ProductionRequest[]> {
    return Array.from(productionRequests.values());
  }
  
  static async getRequestStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    certified: number;
    totalCreditsIssued: number;
  }> {
    const requests = Array.from(productionRequests.values());
    
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      certified: requests.filter(r => r.status === 'certified').length,
      totalCreditsIssued: requests
        .filter(r => r.creditsIssued)
        .reduce((sum, r) => sum + (r.creditsIssued || 0), 0)
    };
  }
}
