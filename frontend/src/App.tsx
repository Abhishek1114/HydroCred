
import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from './components/NavBar';
import UserRegistration from './components/UserRegistration';
import { ToastContainer } from './components/Toast';
import { UserProvider, useUser } from './contexts/UserContext';
import { getWalletAddress } from './lib/chain';
import Home from './pages/Home';
import Certifier from './pages/Certifier';
import Producer from './pages/Producer';
import Buyer from './pages/Buyer';
import Regulator from './pages/Regulator';
import LoadingSpinner from './components/LoadingSpinner';
import './lib/test-env.js';

const AppContent: React.FC = () => {
  const { user, isLoading, isRegistered } = useUser();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      const address = await getWalletAddress();
      setWalletAddress(address);
    } catch (error) {
      console.error('Failed to get wallet address:', error);
    } finally {
      setIsCheckingWallet(false);
    }
  };

  if (isLoading || isCheckingWallet) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show registration if wallet is connected but user is not registered
  if (walletAddress && !isRegistered) {
    return (
      <div className="min-h-screen bg-brand-dark">
        <UserRegistration 
          walletAddress={walletAddress} 
          onRegistrationComplete={() => window.location.reload()} 
        />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <NavBar />
      
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/certifier" element={<Certifier />} />
          <Route path="/producer" element={<Producer />} />
          <Route path="/buyer" element={<Buyer />} />
          <Route path="/regulator" element={<Regulator />} />
        </Routes>
      </motion.main>
      
      <ToastContainer />
    </div>
  );
};

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;