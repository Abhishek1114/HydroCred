import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ethers, BrowserProvider } from 'ethers';

export interface User {
  walletAddress: string;
  role: 'MAIN_ADMIN' | 'COUNTRY_ADMIN' | 'STATE_ADMIN' | 'CITY_ADMIN' | 'PRODUCER' | 'BUYER' | 'AUDITOR' | 'NONE';
  isVerified: boolean;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  name?: string;
  organizationName?: string;
  email?: string;
}

interface WalletContextType {
  // Wallet state
  isConnected: boolean;
  walletAddress: string | null;
  provider: BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  
  // User state
  user: User | null;
  token: string | null;
  isLoading: boolean;
  
  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  login: (signature: string, message: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing connection on load
  useEffect(() => {
    const savedToken = localStorage.getItem('hydrocred_token');
    const savedUser = localStorage.getItem('hydrocred_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      // Attempt to reconnect wallet
      connectWallet();
    }
  }, []);

  const connectWallet = async () => {
    try {
      setIsLoading(true);

      if (!window.ethereum) {
        throw new Error('No crypto wallet found. Please install MetaMask.');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setWalletAddress(address);
      setIsConnected(true);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setWalletAddress(accounts[0]);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress(null);
    setProvider(null);
    setSigner(null);
    logout();
  };

  const login = async (signature: string, message: string) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          signature,
          message
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      setToken(data.token);

      // Save to localStorage
      localStorage.setItem('hydrocred_token', data.token);
      localStorage.setItem('hydrocred_user', JSON.stringify(data.user));

    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hydrocred_token');
    localStorage.removeItem('hydrocred_user');
  };

  const refreshUser = async () => {
    try {
      if (!token) return;

      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('hydrocred_user', JSON.stringify(data.user));
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    provider,
    signer,
    user,
    token,
    isLoading,
    connectWallet,
    disconnectWallet,
    login,
    logout,
    refreshUser,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Extend window object for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}