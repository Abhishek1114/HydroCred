import React from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { Coins } from 'lucide-react';

const TokenDetailsPage: React.FC = () => {
  const { tokenId } = useParams();

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Coins className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">H2 Token #{tokenId}</h1>
              <p className="text-gray-400">Green Hydrogen Credit Details</p>
            </div>
          </div>
        </div>

        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">Token details implementation coming soon...</p>
        </div>
      </motion.div>
    </div>
  );
};

export default TokenDetailsPage;