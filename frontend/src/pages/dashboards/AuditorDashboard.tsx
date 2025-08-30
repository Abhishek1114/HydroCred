import React from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Download, BarChart3 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const AuditorDashboard: React.FC = () => {
  return (
    <DashboardLayout title="Auditor Dashboard" role="AUDITOR">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <FileSearch className="w-8 h-8 text-gray-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Auditor Dashboard</h1>
              <p className="text-gray-400">Read-only access to system data and audit trails</p>
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
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </h2>
            <p className="text-gray-400">View comprehensive system analytics and reports.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <FileSearch className="w-5 h-5" />
              <span>Audit Logs</span>
            </h2>
            <p className="text-gray-400">Access detailed audit trails and transaction logs.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>Export Data</span>
            </h2>
            <p className="text-gray-400">Export audit data in JSON or CSV format.</p>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditorDashboard;