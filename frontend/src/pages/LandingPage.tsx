import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { Leaf, Shield, TrendingUp, Users, Zap, Globe } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { connectWallet, isLoading } = useWallet();

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      navigate('/login');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Blockchain Security',
      description: 'Immutable records and transparent tracking of all green hydrogen credits'
    },
    {
      icon: <Leaf className="w-8 h-8" />,
      title: 'Green Certification',
      description: 'Verified green hydrogen production with environmental compliance'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Credit Trading',
      description: 'Peer-to-peer marketplace for trading certified hydrogen credits'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Role-Based Access',
      description: 'Hierarchical admin system with country, state, and city-level management'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Gasless Tokens',
      description: 'ERC-721 tokens representing 1kg of certified green hydrogen'
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'Global Scale',
      description: 'Designed for worldwide adoption with multi-jurisdiction support'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.section 
        className="relative overflow-hidden py-20 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Hydro<span className="text-green-400">Cred</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Blockchain-based Green Hydrogen Credit Tracking & Trading Platform
            </p>
            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Track, certify, and trade green hydrogen credits transparently using blockchain technology. 
              Each H2 token represents 1kg of certified green hydrogen production.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center"
          >
            <button
              onClick={handleConnectWallet}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-4 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 font-semibold rounded-lg transition-colors"
            >
              Learn More
            </button>
          </motion.div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        id="features"
        className="py-20 px-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose HydroCred?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              A comprehensive solution for green hydrogen credit management with enterprise-grade security and transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="text-green-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="py-20 px-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join the future of green hydrogen credit trading today.
          </p>
          <button
            onClick={handleConnectWallet}
            disabled={isLoading}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connecting...' : 'Connect Your Wallet'}
          </button>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500">
            © 2024 HydroCred. Built for sustainable hydrogen economy.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;