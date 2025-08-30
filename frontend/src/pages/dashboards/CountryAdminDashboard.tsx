import React from 'react';
import { motion } from 'framer-motion';
import { Flag, Users, Plus } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const CountryAdminDashboard: React.FC = () => {
  return (
    <DashboardLayout title="Country Admin Dashboard" role="COUNTRY_ADMIN">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Flag className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Country Administrator</h1>
              <p className="text-gray-400">Manage state administrators and country-wide operations</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Appoint State Admin</span>
            </h2>
            <p className="text-gray-400">Appoint state-level administrators within your country jurisdiction.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Manage States</span>
            </h2>
            <p className="text-gray-400">Monitor and manage all state administrators in your country.</p>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CountryAdminDashboard;