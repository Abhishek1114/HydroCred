import React from 'react';
import { motion } from 'framer-motion';
import { Building2, UserCheck, FileCheck } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const CityAdminDashboard: React.FC = () => {
  return (
    <DashboardLayout title="City Admin Dashboard" role="CITY_ADMIN">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Building2 className="w-8 h-8 text-green-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">City Administrator & Certifier</h1>
              <p className="text-gray-400">Approve producers and certify hydrogen production</p>
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
              <UserCheck className="w-5 h-5" />
              <span>Approve Producers</span>
            </h2>
            <p className="text-gray-400">Review and approve producer applications in your city.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <FileCheck className="w-5 h-5" />
              <span>Certify Production</span>
            </h2>
            <p className="text-gray-400">Review and certify hydrogen production requests.</p>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CityAdminDashboard;