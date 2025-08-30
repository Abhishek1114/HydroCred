import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useToast } from '../components/ui/toast';
import { Wallet, UserCheck, UserPlus } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { walletAddress, isConnected, connectWallet, login, isLoading } = useWallet();
  const { addToast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect wallet'
      });
    }
  };

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);

      if (!walletAddress) {
        throw new Error('No wallet connected');
      }

      // Create signature message
      const message = `Welcome to HydroCred!\n\nPlease sign this message to authenticate your wallet.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;

      // Request signature from user
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });

      // Authenticate with backend
      await login(signature, message);

      addToast({
        type: 'success',
        title: 'Welcome to HydroCred!',
        description: 'Successfully authenticated with your wallet'
      });

      navigate('/dashboard');

    } catch (error) {
      console.error('Sign in failed:', error);
      addToast({
        type: 'error',
        title: 'Authentication Failed',
        description: error instanceof Error ? error.message : 'Failed to sign in'
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Wallet className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome to HydroCred
            </h1>
            <p className="text-gray-400">
              Connect your wallet to access the green hydrogen credit platform
            </p>
          </div>

          {/* Connection Status */}
          <div className="space-y-4">
            {!isConnected ? (
              <motion.button
                onClick={handleConnectWallet}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" color="text-white" />
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    <span>Connect Wallet</span>
                  </>
                )}
              </motion.button>
            ) : (
              <div className="space-y-4">
                {/* Wallet Connected */}
                <div className="flex items-center space-x-3 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-400">Wallet Connected</p>
                    <p className="text-xs text-gray-400 font-mono">
                      {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                    </p>
                  </div>
                </div>

                {/* Sign In Button */}
                <motion.button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="w-full flex items-center justify-center space-x-3 py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSigningIn ? (
                    <LoadingSpinner size="sm" color="text-white" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>Sign In</span>
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have a wallet?{' '}
              <a 
                href="https://metamask.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Install MetaMask
              </a>
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="p-4 bg-white/5 rounded-lg border border-gray-800"
          >
            <h3 className="font-semibold text-white mb-2">For Producers</h3>
            <p className="text-sm text-gray-400">
              Submit production data, get certified, and sell your green hydrogen credits
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="p-4 bg-white/5 rounded-lg border border-gray-800"
          >
            <h3 className="font-semibold text-white mb-2">For Buyers</h3>
            <p className="text-sm text-gray-400">
              Purchase verified credits, track your carbon offset, and retire credits
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;