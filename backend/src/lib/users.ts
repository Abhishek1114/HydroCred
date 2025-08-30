import { ethers } from 'ethers';
import { hash } from './crypto';

export interface User {
  id: string;
  walletAddress: string;
  role: UserRole;
  name: string;
  email?: string;
  organization: string;
  location: {
    country: string;
    state: string;
    city: string;
  };
  verifiedBy: string; // Admin wallet address that verified this user
  verifiedAt: Date;
  status: 'pending' | 'verified' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  walletAddress: string;
  role: UserRole;
  name: string;
  email?: string;
  organization: string;
  location: {
    country: string;
    state: string;
    city: string;
  };
  verifiedBy: string;
}

export enum UserRole {
  COUNTRY_ADMIN = 'COUNTRY_ADMIN',
  STATE_ADMIN = 'STATE_ADMIN',
  CITY_ADMIN = 'CITY_ADMIN',
  PRODUCER = 'PRODUCER',
  BUYER = 'BUYER',
  AUDITOR = 'AUDITOR'
}

export interface RoleHierarchy {
  [UserRole.COUNTRY_ADMIN]: UserRole[];
  [UserRole.STATE_ADMIN]: UserRole[];
  [UserRole.CITY_ADMIN]: UserRole[];
  [UserRole.PRODUCER]: UserRole[];
  [UserRole.BUYER]: UserRole[];
  [UserRole.AUDITOR]: UserRole[];
}

// Role hierarchy - who can verify whom
export const ROLE_HIERARCHY: RoleHierarchy = {
  [UserRole.COUNTRY_ADMIN]: [UserRole.STATE_ADMIN, UserRole.CITY_ADMIN, UserRole.PRODUCER, UserRole.BUYER, UserRole.AUDITOR],
  [UserRole.STATE_ADMIN]: [UserRole.CITY_ADMIN, UserRole.PRODUCER, UserRole.BUYER, UserRole.AUDITOR],
  [UserRole.CITY_ADMIN]: [UserRole.PRODUCER, UserRole.BUYER, UserRole.AUDITOR],
  [UserRole.PRODUCER]: [],
  [UserRole.BUYER]: [],
  [UserRole.AUDITOR]: []
};

// In-memory user storage (replace with MongoDB in production)
const users = new Map<string, User>();

export class UserManager {
  static async createUser(userData: CreateUserData): Promise<User> {
    const id = hash(userData.walletAddress + Date.now().toString());
    
    const user: User = {
      ...userData,
      id,
      verifiedAt: new Date(),
      status: 'verified',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    users.set(id, user);
    users.set(userData.walletAddress.toLowerCase(), user);
    
    return user;
  }
  
  static async getUserByWallet(walletAddress: string): Promise<User | null> {
    return users.get(walletAddress.toLowerCase()) || null;
  }
  
  static async getUserById(id: string): Promise<User | null> {
    return users.get(id) || null;
  }
  
  static async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = users.get(id);
    if (!user) return null;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    users.set(id, updatedUser);
    users.set(updatedUser.walletAddress.toLowerCase(), updatedUser);
    
    return updatedUser;
  }
  
  static async verifyUser(verifierWallet: string, userToVerify: string, newRole?: UserRole): Promise<boolean> {
    const verifier = await this.getUserByWallet(verifierWallet);
    const user = await this.getUserById(userToVerify);
    
    if (!verifier || !user) return false;
    
    // Check if verifier can verify this user's role
    const canVerify = ROLE_HIERARCHY[verifier.role]?.includes(user.role);
    if (!canVerify) return false;
    
    // Update user verification
    user.verifiedBy = verifierWallet;
    user.verifiedAt = new Date();
    user.status = 'verified';
    if (newRole) user.role = newRole;
    
    await this.updateUser(user.id, user);
    return true;
  }
  
  static async canVerifyRole(verifierRole: UserRole, targetRole: UserRole): Promise<boolean> {
    return ROLE_HIERARCHY[verifierRole]?.includes(targetRole) || false;
  }
  
  static async getUsersByRole(role: UserRole): Promise<User[]> {
    return Array.from(users.values()).filter(user => user.role === role);
  }
  
  static async getUsersByLocation(country?: string, state?: string, city?: string): Promise<User[]> {
    return Array.from(users.values()).filter(user => {
      if (country && user.location.country !== country) return false;
      if (state && user.location.state !== state) return false;
      if (city && user.location.city !== city) return false;
      return true;
    });
  }
  
  static async getAllUsers(): Promise<User[]> {
    return Array.from(users.values());
  }
}

// Initialize with default admin user
export async function initializeDefaultAdmin(): Promise<void> {
  const defaultAdmin: Omit<User, 'id' | 'verifiedAt' | 'status' | 'createdAt' | 'updatedAt'> = {
    walletAddress: '0x0000000000000000000000000000000000000000', // Replace with actual admin wallet
    role: UserRole.COUNTRY_ADMIN,
    name: 'System Administrator',
    organization: 'HydroCred System',
    location: {
      country: 'Global',
      state: 'Global',
      city: 'Global'
    },
    verifiedBy: '0x0000000000000000000000000000000000000000'
  };
  
  await UserManager.createUser(defaultAdmin);
}
