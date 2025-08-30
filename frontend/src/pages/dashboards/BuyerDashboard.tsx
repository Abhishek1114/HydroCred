import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Coins, TrendingDown } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const BuyerDashboard: React.FC = () => {
  return (
    <DashboardLayout title="Buyer Dashboard" role="BUYER">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <ShoppingCart className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Buyer Dashboard</h1>
              <p className="text-gray-400">Purchase and retire green hydrogen credits</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Marketplace</span>
            </h2>
            <p className="text-gray-400">Browse and purchase verified hydrogen credits.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Coins className="w-5 h-5" />
              <span>My Credits</span>
            </h2>
            <p className="text-gray-400">View and manage your hydrogen credit portfolio.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <TrendingDown className="w-5 h-5" />
              <span>Retire Credits</span>
            </h2>
            <p className="text-gray-400">Retire credits to claim environmental benefits.</p>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BuyerDashboard;