import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, apiClient } from '../lib/api';
import { getWalletAddress } from '../lib/chain';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isRegistered: boolean;
  checkUserRegistration: () => Promise<void>;
  registerUser: (userData: any) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    checkUserRegistration();
  }, []);

  const checkUserRegistration = async () => {
    try {
      const walletAddress = await getWalletAddress();
      
      if (walletAddress) {
        try {
          const response = await apiClient.getUser(walletAddress);
          if (response.success && response.user) {
            setUser(response.user);
            setIsRegistered(true);
          } else {
            setUser(null);
            setIsRegistered(false);
          }
        } catch (error) {
          // User not found - not registered
          setUser(null);
          setIsRegistered(false);
        }
      }
    } catch (error) {
      console.error('Failed to check user registration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (userData: any) => {
    try {
      const response = await apiClient.registerUser(userData);
      if (response.success) {
        setUser(response.user);
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setIsRegistered(false);
  };

  const value = {
    user,
    isLoading,
    isRegistered,
    checkUserRegistration,
    registerUser,
    logout
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};