import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Building, Plus } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const StateAdminDashboard: React.FC = () => {
  return (
    <DashboardLayout title="State Admin Dashboard" role="STATE_ADMIN">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <MapPin className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">State Administrator</h1>
              <p className="text-gray-400">Manage city administrators and state-wide operations</p>
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
              <span>Appoint City Admin</span>
            </h2>
            <p className="text-gray-400">Appoint city-level administrators within your state jurisdiction.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Manage Cities</span>
            </h2>
            <p className="text-gray-400">Monitor and manage all city administrators in your state.</p>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StateAdminDashboard;