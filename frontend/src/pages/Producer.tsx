import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Send, RefreshCw, Plus, Upload, FileText } from 'lucide-react';
import { getWalletAddress, getOwnedTokens, transferCredit, isTokenRetired, handleChainError, waitForTransactionAndRefresh, listenForTransfers } from '../lib/chain';
import { apiClient, ProductionRequest } from '../lib/api';
import { toast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

interface CreditToken {
  tokenId: number;
  isRetired: boolean;
}

const Producer: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'credits' | 'request' | 'sell' | 'history'>('credits');
  const [productionRequests, setProductionRequests] = useState<ProductionRequest[]>([]);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  
  // Transfer form state
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [transferAddress, setTransferAddress] = useState('');
  
  // Production request form state
  const [requestForm, setRequestForm] = useState({
    producerName: '',
    organization: '',
    location: {
      country: '',
      state: '',
      city: ''
    },
    productionData: {
      hydrogenAmount: '',
      productionDate: '',
      energySource: '',
      energySourceDetails: '',
      carbonFootprint: '',
      certificationDocuments: [] as string[]
    }
  });

  // Marketplace listing form state
  const [listingForm, setListingForm] = useState({
    selectedTokenIds: [] as number[],
    pricePerCredit: '',
    sellerName: ''
  });
  const [isCreatingListing, setIsCreatingListing] = useState(false);

  useEffect(() => {
    loadWalletAndCredits();
    
    // Set up transfer event listener
    const setupTransferListener = async () => {
      await listenForTransfers((from, to, tokenId) => {
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
        await loadProductionRequests(address);
      }
    } catch (error) {
      console.error('Failed to load wallet and credits:', error);
      toast.error('Failed to connect to blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductionRequests = async (address: string) => {
    try {
      const response = await apiClient.getProductionRequests({ producer: address });
      setProductionRequests(response.requests);
    } catch (error) {
      console.error('Failed to load production requests:', error);
      toast.error('Failed to load production requests');
    }
  };

  const handleSubmitProductionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress) {
      toast.error('Please connect your wallet');
      return;
    }

    // Validate required fields
    if (!requestForm.producerName || !requestForm.organization || 
        !requestForm.location.country || !requestForm.location.state || 
        !requestForm.location.city || !requestForm.productionData.hydrogenAmount ||
        !requestForm.productionData.productionDate || !requestForm.productionData.energySource) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmittingRequest(true);
    
    try {
      const requestData = {
        producerWallet: walletAddress,
        producerName: requestForm.producerName,
        organization: requestForm.organization,
        location: requestForm.location,
        productionData: {
          hydrogenAmount: parseFloat(requestForm.productionData.hydrogenAmount),
          productionDate: requestForm.productionData.productionDate,
          energySource: requestForm.productionData.energySource,
          energySourceDetails: requestForm.productionData.energySourceDetails,
          carbonFootprint: parseFloat(requestForm.productionData.carbonFootprint) || 0,
          certificationDocuments: requestForm.productionData.certificationDocuments
        }
      };

      const response = await apiClient.createProductionRequest(requestData);
      
      if (response.success) {
        toast.success('Production request submitted successfully');
        setRequestForm({
          producerName: '',
          organization: '',
          location: { country: '', state: '', city: '' },
          productionData: {
            hydrogenAmount: '',
            productionDate: '',
            energySource: '',
            energySourceDetails: '',
            carbonFootprint: '',
            certificationDocuments: []
          }
        });
        await loadProductionRequests(walletAddress);
      }
    } catch (error) {
      console.error('Failed to submit production request:', error);
      toast.error('Failed to submit production request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress) {
      toast.error('Please connect your wallet');
      return;
    }

    if (listingForm.selectedTokenIds.length === 0 || !listingForm.pricePerCredit || !listingForm.sellerName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreatingListing(true);
    
    try {
      const totalPrice = listingForm.selectedTokenIds.length * parseFloat(listingForm.pricePerCredit);
      
      const response = await apiClient.createMarketplaceListing({
        sellerWallet: walletAddress,
        sellerName: listingForm.sellerName,
        tokenIds: listingForm.selectedTokenIds,
        pricePerCredit: parseFloat(listingForm.pricePerCredit),
        totalPrice
      });
      
      if (response.success) {
        toast.success('Marketplace listing created successfully');
        setListingForm({
          selectedTokenIds: [],
          pricePerCredit: '',
          sellerName: ''
        });
      }
    } catch (error) {
      console.error('Failed to create listing:', error);
      toast.error('Failed to create marketplace listing');
    } finally {
      setIsCreatingListing(false);
    }
  };

  const toggleTokenSelection = (tokenId: number) => {
    setListingForm(prev => ({
      ...prev,
      selectedTokenIds: prev.selectedTokenIds.includes(tokenId)
        ? prev.selectedTokenIds.filter(id => id !== tokenId)
        : [...prev.selectedTokenIds, tokenId]
    }));
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

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTokenId || !transferAddress || !walletAddress) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsTransferring(selectedTokenId);
    
    try {
      const tx = await transferCredit(walletAddress, transferAddress, selectedTokenId);
      
      toast.info('Transfer submitted. Waiting for confirmation...');
      
      // Use the new transaction handling
      await waitForTransactionAndRefresh(tx, () => {
        if (walletAddress) {
          loadCredits(walletAddress);
        }
      });
      
      toast.success(`Credit #${selectedTokenId} transferred successfully`);
      setSelectedTokenId(null);
      setTransferAddress('');
      
    } catch (error) {
      const chainError = handleChainError(error);
      toast.error(chainError.message);
    } finally {
      setIsTransferring(null);
    }
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
          <Leaf className="h-16 w-16 text-brand mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400">Please connect your wallet to access the producer dashboard</p>
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
                <Leaf className="h-8 w-8 text-brand" />
                <h1 className="text-3xl font-bold">Producer Dashboard</h1>
              </div>
              <button
                onClick={handleRefresh}
                className="btn-secondary flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
            <p className="text-gray-400">Manage your green hydrogen production credits</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              <p className="text-gray-400">Active Credits</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="card text-center"
            >
              <h3 className="text-2xl font-bold text-gray-400">{retiredCredits.length}</h3>
              <p className="text-gray-400">Retired Credits</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="card text-center"
            >
              <h3 className="text-2xl font-bold text-blue-400">{productionRequests.length}</h3>
              <p className="text-gray-400">Requests</p>
            </motion.div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
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
              <button
                onClick={() => setActiveTab('request')}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeTab === 'request' 
                    ? 'bg-brand text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Request Certification
              </button>
              <button
                onClick={() => setActiveTab('sell')}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeTab === 'sell' 
                    ? 'bg-brand text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sell Credits
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeTab === 'history' 
                    ? 'bg-brand text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Request History
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'credits' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Transfer Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="card"
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Send className="h-5 w-5 mr-2 text-brand" />
                Transfer Credit
              </h2>
              
              {activeCredits.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No active credits available for transfer
                </p>
              ) : (
                <form onSubmit={handleTransfer} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Credit to Transfer
                    </label>
                    <select
                      value={selectedTokenId || ''}
                      onChange={(e) => setSelectedTokenId(Number(e.target.value))}
                      className="input w-full"
                      required
                    >
                      <option value="">Choose a credit...</option>
                      {activeCredits.map((credit) => (
                        <option key={credit.tokenId} value={credit.tokenId}>
                          Credit #{credit.tokenId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={transferAddress}
                      onChange={(e) => setTransferAddress(e.target.value)}
                      placeholder="0x..."
                      className="input w-full"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isTransferring !== null}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                  >
                    {isTransferring === selectedTokenId ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Transferring...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Transfer Credit</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Credits List */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="card"
            >
              <h2 className="text-xl font-semibold mb-6">Your Credits</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {credits.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No credits found. Contact a certifier to get credits issued.
                  </p>
                ) : (
                  credits.map((credit) => (
                    <div
                      key={credit.tokenId}
                      className={`p-4 rounded-xl border transition-all ${
                        credit.isRetired
                          ? 'bg-gray-900/50 border-gray-700 opacity-60'
                          : 'bg-gray-800/50 border-gray-600 hover:border-brand/50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">
                            Credit #{credit.tokenId}
                          </p>
                          <p className="text-sm text-gray-400">
                            Status: {credit.isRetired ? 'Retired' : 'Active'}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            credit.isRetired ? 'bg-gray-500' : 'bg-green-500'
                          }`} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
            </div>
          )}

          {/* Production Request Tab */}
          {activeTab === 'request' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="card"
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Plus className="h-5 w-5 mr-2 text-brand" />
                Request Production Certification
              </h2>
              
              <form onSubmit={handleSubmitProductionRequest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Producer Name *</label>
                    <input
                      type="text"
                      value={requestForm.producerName}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, producerName: e.target.value }))}
                      className="input w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Organization *</label>
                    <input
                      type="text"
                      value={requestForm.organization}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, organization: e.target.value }))}
                      className="input w-full"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Country *</label>
                    <input
                      type="text"
                      value={requestForm.location.country}
                      onChange={(e) => setRequestForm(prev => ({ 
                        ...prev, 
                        location: { ...prev.location, country: e.target.value }
                      }))}
                      className="input w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">State *</label>
                    <input
                      type="text"
                      value={requestForm.location.state}
                      onChange={(e) => setRequestForm(prev => ({ 
                        ...prev, 
                        location: { ...prev.location, state: e.target.value }
                      }))}
                      className="input w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">City *</label>
                    <input
                      type="text"
                      value={requestForm.location.city}
                      onChange={(e) => setRequestForm(prev => ({ 
                        ...prev, 
                        location: { ...prev.location, city: e.target.value }
                      }))}
                      className="input w-full"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Hydrogen Amount (kg) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={requestForm.productionData.hydrogenAmount}
                      onChange={(e) => setRequestForm(prev => ({ 
                        ...prev, 
                        productionData: { ...prev.productionData, hydrogenAmount: e.target.value }
                      }))}
                      className="input w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Production Date *</label>
                    <input
                      type="date"
                      value={requestForm.productionData.productionDate}
                      onChange={(e) => setRequestForm(prev => ({ 
                        ...prev, 
                        productionData: { ...prev.productionData, productionDate: e.target.value }
                      }))}
                      className="input w-full"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Energy Source *</label>
                    <select
                      value={requestForm.productionData.energySource}
                      onChange={(e) => setRequestForm(prev => ({ 
                        ...prev, 
                        productionData: { ...prev.productionData, energySource: e.target.value }
                      }))}
                      className="input w-full"
                      required
                    >
                      <option value="">Select energy source...</option>
                      <option value="solar">Solar</option>
                      <option value="wind">Wind</option>
                      <option value="hydro">Hydroelectric</option>
                      <option value="geothermal">Geothermal</option>
                      <option value="biomass">Biomass</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Carbon Footprint (kg CO2)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={requestForm.productionData.carbonFootprint}
                      onChange={(e) => setRequestForm(prev => ({ 
                        ...prev, 
                        productionData: { ...prev.productionData, carbonFootprint: e.target.value }
                      }))}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Energy Source Details</label>
                  <textarea
                    value={requestForm.productionData.energySourceDetails}
                    onChange={(e) => setRequestForm(prev => ({ 
                      ...prev, 
                      productionData: { ...prev.productionData, energySourceDetails: e.target.value }
                    }))}
                    className="input w-full"
                    rows={3}
                    placeholder="Provide details about your renewable energy source..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  {isSubmittingRequest ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>Submit Certification Request</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* Sell Credits Tab */}
          {activeTab === 'sell' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="card"
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Send className="h-5 w-5 mr-2 text-brand" />
                Create Marketplace Listing
              </h2>
              
              {activeCredits.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No active credits available for sale
                </p>
              ) : (
                <form onSubmit={handleCreateListing} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Seller Name *</label>
                      <input
                        type="text"
                        value={listingForm.sellerName}
                        onChange={(e) => setListingForm(prev => ({ ...prev, sellerName: e.target.value }))}
                        className="input w-full"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Price per Credit (USD) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={listingForm.pricePerCredit}
                        onChange={(e) => setListingForm(prev => ({ ...prev, pricePerCredit: e.target.value }))}
                        className="input w-full"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-4">
                      Select Credits to Sell * ({listingForm.selectedTokenIds.length} selected)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {activeCredits.map((credit) => (
                        <div
                          key={credit.tokenId}
                          onClick={() => toggleTokenSelection(credit.tokenId)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            listingForm.selectedTokenIds.includes(credit.tokenId)
                              ? 'border-brand bg-brand/10'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Credit #{credit.tokenId}</span>
                            <div className={`w-4 h-4 rounded border-2 ${
                              listingForm.selectedTokenIds.includes(credit.tokenId)
                                ? 'bg-brand border-brand'
                                : 'border-gray-500'
                            }`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {listingForm.selectedTokenIds.length > 0 && listingForm.pricePerCredit && (
                    <div className="bg-brand/10 border border-brand rounded-lg p-4">
                      <h4 className="font-medium text-brand mb-2">Listing Summary</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Credits:</span>
                          <span className="ml-2 font-medium">{listingForm.selectedTokenIds.length}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Price per Credit:</span>
                          <span className="ml-2 font-medium">${listingForm.pricePerCredit}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Total Price:</span>
                          <span className="ml-2 font-medium">
                            ${(listingForm.selectedTokenIds.length * parseFloat(listingForm.pricePerCredit || '0')).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isCreatingListing || listingForm.selectedTokenIds.length === 0}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                  >
                    {isCreatingListing ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Creating Listing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Create Marketplace Listing</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* Request History Tab */}
          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="card"
            >
              <h2 className="text-xl font-semibold mb-6">Production Request History</h2>
              
              <div className="space-y-4">
                {productionRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No production requests found
                  </p>
                ) : (
                  productionRequests.map((request) => (
                    <div key={request.id} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{request.productionData.hydrogenAmount} kg H2</h3>
                          <p className="text-sm text-gray-400">
                            {request.productionData.energySource} • {request.productionData.productionDate}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'approved' ? 'bg-green-900 text-green-400' :
                          request.status === 'rejected' ? 'bg-red-900 text-red-400' :
                          'bg-yellow-900 text-yellow-400'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-500 grid grid-cols-2 gap-4">
                        <p>Organization: {request.organization}</p>
                        <p>Location: {request.location.city}, {request.location.state}</p>
                        {request.creditsIssued && (
                          <p>Credits Issued: {request.creditsIssued}</p>
                        )}
                        {request.certifiedBy && (
                          <p>Certified By: {request.certifiedBy.slice(0, 6)}...{request.certifiedBy.slice(-4)}</p>
                        )}
                      </div>
                      
                      {request.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-900/20 border border-red-700 rounded text-sm text-red-400">
                          Rejection Reason: {request.rejectionReason}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Producer;