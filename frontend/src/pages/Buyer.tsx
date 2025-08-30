import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Trash2, Download, RefreshCw, ShoppingCart, Search } from 'lucide-react';
import { getWalletAddress, getOwnedTokens, retireCredit, isTokenRetired, handleChainError, waitForTransactionAndRefresh, listenForTransfers } from '../lib/chain';
import { apiClient, CreditListing } from '../lib/api';
import { toast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

interface CreditToken {
  tokenId: number;
  isRetired: boolean;
}

const Buyer: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetiring, setIsRetiring] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'credits'>('marketplace');
  const [marketplaceListings, setMarketplaceListings] = useState<CreditListing[]>([]);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Retirement confirmation state
  const [confirmRetirement, setConfirmRetirement] = useState<number | null>(null);

  useEffect(() => {
    loadWalletAndCredits();
    
    // Set up transfer event listener
    const setupTransferListener = async () => {
      await listenForTransfers(() => {
        console.log('🔄 Transfer detected, refreshing credits...');
        if (walletAddress) {
          loadCredits(walletAddress);
        }
      });
    };
    
    setupTransferListener();
  }, [walletAddress]);

  const loadWalletAndCredits = async () => {
    try {
      const address = await getWalletAddress();
      setWalletAddress(address);
      
      if (address) {
        await loadCredits(address);
        await loadMarketplaceListings();
      }
    } catch (error) {
      console.error('Failed to load wallet and credits:', error);
      toast.error('Failed to connect to blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMarketplaceListings = async () => {
    try {
      const response = await apiClient.getMarketplaceListings();
      setMarketplaceListings(response.listings.filter(listing => listing.status === 'active'));
    } catch (error) {
      console.error('Failed to load marketplace listings:', error);
      toast.error('Failed to load marketplace');
    }
  };

  const handlePurchaseCredits = async (listingId: string) => {
    if (!walletAddress) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsPurchasing(listingId);
    
    try {
      const response = await apiClient.purchaseCredits(listingId, walletAddress);
      
      if (response.success) {
        toast.success('Credits purchased successfully');
        await loadMarketplaceListings();
        await loadCredits(walletAddress);
      }
    } catch (error) {
      console.error('Failed to purchase credits:', error);
      toast.error('Failed to purchase credits');
    } finally {
      setIsPurchasing(null);
    }
  };

  const loadCredits = async (address: string) => {
    try {
      console.log('🔄 Loading credits for address:', address);
      const tokenIds = await getOwnedTokens(address);
      console.log('📋 Found token IDs:', tokenIds);
      
      const creditsWithStatus = await Promise.all(
        tokenIds.map(async (tokenId) => ({
          tokenId,
          isRetired: await isTokenRetired(tokenId),
        }))
      );
      
      console.log('✅ Credits loaded:', creditsWithStatus);
      setCredits(creditsWithStatus);
    } catch (error) {
      console.error('Failed to load credits:', error);
      toast.error('Failed to load your credits');
    }
  };

  const handleRetireCredit = async (tokenId: number) => {
    setIsRetiring(tokenId);
    
    try {
      const tx = await retireCredit(tokenId);
      
      toast.info('Retirement submitted. Waiting for confirmation...');
      
      // Use the new transaction handling
      await waitForTransactionAndRefresh(tx, () => {
        if (walletAddress) {
          loadCredits(walletAddress);
        }
      });
      
      toast.success(`Credit #${tokenId} retired successfully`);
      setConfirmRetirement(null);
      
    } catch (error) {
      const chainError = handleChainError(error);
      toast.error(chainError.message);
    } finally {
      setIsRetiring(null);
    }
  };

  const downloadRetirementProof = (tokenId: number) => {
    const proof = {
      creditId: tokenId,
      retiredBy: walletAddress,
      retiredAt: new Date().toISOString(),
      blockchain: 'Ethereum Sepolia Testnet',
      contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
      purpose: 'Carbon offset via green hydrogen credit retirement',
      verification: 'This credit has been permanently retired and cannot be transferred.',
    };
    
    const dataStr = JSON.stringify(proof, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `hydrocred-retirement-proof-${tokenId}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Retirement proof downloaded');
  };

  const handleRefresh = () => {
    if (walletAddress) {
      loadCredits(walletAddress);
      toast.info('Refreshing credits...');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Users className="h-16 w-16 text-brand mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400">Please connect your wallet to access the buyer dashboard</p>
        </motion.div>
      </div>
    );
  }

  const activeCredits = credits.filter(c => !c.isRetired);
  const retiredCredits = credits.filter(c => c.isRetired);

  return (
    <div className="min-h-screen bg-gradient-dark py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-brand" />
                <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
              </div>
              <button
                onClick={() => {
                  handleRefresh();
                  loadMarketplaceListings();
                }}
                className="btn-secondary flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
            <p className="text-gray-400">Purchase and retire credits for carbon offset</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="card text-center"
            >
              <h3 className="text-2xl font-bold text-blue-400">{marketplaceListings.length}</h3>
              <p className="text-gray-400">Available Listings</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="card text-center"
            >
              <h3 className="text-2xl font-bold text-brand">{credits.length}</h3>
              <p className="text-gray-400">Owned Credits</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="card text-center"
            >
              <h3 className="text-2xl font-bold text-green-400">{activeCredits.length}</h3>
              <p className="text-gray-400">Active Credits</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="card text-center"
            >
              <h3 className="text-2xl font-bold text-gray-400">{retiredCredits.length}</h3>
              <p className="text-gray-400">Retired Credits</p>
            </motion.div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('marketplace')}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeTab === 'marketplace' 
                    ? 'bg-brand text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Marketplace
              </button>
              <button
                onClick={() => setActiveTab('credits')}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeTab === 'credits' 
                    ? 'bg-brand text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                My Credits
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'marketplace' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2 text-brand" />
                  Credit Marketplace
                </h2>
                
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-brand" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by seller..."
                    className="input w-64"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                {marketplaceListings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No credits available for purchase
                  </p>
                ) : (
                  marketplaceListings
                    .filter(listing => 
                      !searchTerm || 
                      listing.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      listing.sellerWallet.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((listing) => (
                      <div key={listing.id} className="border border-gray-700 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{listing.sellerName}</h3>
                            <p className="text-gray-400">
                              {listing.sellerWallet.slice(0, 6)}...{listing.sellerWallet.slice(-4)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-brand">${listing.pricePerCredit}</p>
                            <p className="text-sm text-gray-400">per credit</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-400">Credits Available:</span>
                            <span className="ml-2 font-medium">{listing.tokenIds.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Total Price:</span>
                            <span className="ml-2 font-medium">${listing.totalPrice}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Listed:</span>
                            <span className="ml-2 font-medium">
                              {new Date(listing.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Expires:</span>
                            <span className="ml-2 font-medium">
                              {new Date(listing.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handlePurchaseCredits(listing.id)}
                          disabled={isPurchasing === listing.id || listing.sellerWallet === walletAddress}
                          className="btn-primary w-full flex items-center justify-center space-x-2"
                        >
                          {isPurchasing === listing.id ? (
                            <>
                              <LoadingSpinner size="sm" />
                              <span>Purchasing...</span>
                            </>
                          ) : listing.sellerWallet === walletAddress ? (
                            <span>Your Own Listing</span>
                          ) : (
                            <>
                              <ShoppingCart className="h-4 w-4" />
                              <span>Purchase Credits</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'credits' && (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="card text-center"
            >
              <h3 className="text-2xl font-bold text-brand">{credits.length}</h3>
              <p className="text-gray-400">Total Credits</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="card text-center"
            >
              <h3 className="text-2xl font-bold text-green-400">{activeCredits.length}</h3>
              <p className="text-gray-400">Available to Retire</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="card text-center"
            >
              <h3 className="text-2xl font-bold text-orange-400">{retiredCredits.length}</h3>
              <p className="text-gray-400">Retired for Offset</p>
            </motion.div>
          </div>

          {/* Credits Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Credits */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="card"
            >
              <h2 className="text-xl font-semibold mb-6">Active Credits</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activeCredits.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No active credits. Purchase credits from producers to get started.
                  </p>
                ) : (
                  activeCredits.map((credit) => (
                    <div key={credit.tokenId} className="bg-gray-800/50 rounded-xl p-4 border border-gray-600">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-semibold text-brand">
                            Credit #{credit.tokenId}
                          </p>
                          <p className="text-sm text-gray-400">
                            1 verified green hydrogen unit
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setConfirmRetirement(credit.tokenId)}
                            disabled={isRetiring === credit.tokenId}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Retire</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <span className="text-xs text-green-400 font-medium">Active</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Retired Credits */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="card"
            >
              <h2 className="text-xl font-semibold mb-6">Retired Credits</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {retiredCredits.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No retired credits yet
                  </p>
                ) : (
                  retiredCredits.map((credit) => (
                    <div key={credit.tokenId} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 opacity-80">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-semibold text-gray-300">
                            Credit #{credit.tokenId}
                          </p>
                          <p className="text-sm text-gray-500">
                            Permanently retired
                          </p>
                        </div>
                        
                        <button
                          onClick={() => downloadRetirementProof(credit.tokenId)}
                          className="bg-brand hover:bg-brand-accent text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1"
                        >
                          <Download className="h-3 w-3" />
                          <span>Proof</span>
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="w-3 h-3 bg-gray-500 rounded-full" />
                        <span className="text-xs text-gray-500 font-medium">Retired</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
          </>
          )}

          {/* Retirement Confirmation Modal */}
          {confirmRetirement && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card max-w-md mx-4"
              >
                <h3 className="text-xl font-bold mb-4">Confirm Credit Retirement</h3>
                <p className="text-gray-400 mb-6">
                  Are you sure you want to retire Credit #{confirmRetirement}? 
                  This action is permanent and cannot be undone.
                </p>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setConfirmRetirement(null)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRetireCredit(confirmRetirement)}
                    disabled={isRetiring === confirmRetirement}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-200 flex-1 flex items-center justify-center space-x-2"
                  >
                    {isRetiring === confirmRetirement ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Retiring...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Retire Credit</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Buyer;