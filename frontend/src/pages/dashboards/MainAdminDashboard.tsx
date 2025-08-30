import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '../../contexts/WalletContext';
import { useToast } from '../../components/ui/toast';
import { adminAPI, systemAPI } from '../../lib/api';
import { 
  Crown, 
  Users, 
  TrendingUp, 
  Shield, 
  Plus,
  ChevronRight,
  Activity,
  BarChart3,
  FileText
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import DashboardLayout from '../../components/DashboardLayout';

const MainAdminDashboard: React.FC = () => {
  const { user } = useWallet();
  const { addToast } = useToast();
  const [isAppointingAdmin, setIsAppointingAdmin] = useState(false);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminOrg, setNewAdminOrg] = useState('');

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminAPI.getAnalytics,
  });

  // Fetch system status
  const { data: systemStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: systemAPI.getStatus,
  });

  // Fetch pending approvals
  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: adminAPI.getPendingApprovals,
  });

  const handleAppointCountryAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminAddress || !newAdminName) {
      addToast({
        type: 'error',
        title: 'Missing Information',
        description: 'Please provide wallet address and name'
      });
      return;
    }

    try {
      setIsAppointingAdmin(true);
      
      const result = await adminAPI.appointCountryAdmin({
        adminAddress: newAdminAddress,
        name: newAdminName,
        organizationName: newAdminOrg || undefined
      });

      addToast({
        type: 'success',
        title: 'Country Admin Appointed',
        description: `Successfully appointed ${newAdminName} as Country Admin`
      });

      // Reset form
      setNewAdminAddress('');
      setNewAdminName('');
      setNewAdminOrg('');

      // Refresh data
      window.location.reload();

    } catch (error) {
      addToast({
        type: 'error',
        title: 'Appointment Failed',
        description: error instanceof Error ? error.message : 'Failed to appoint admin'
      });
    } finally {
      setIsAppointingAdmin(false);
    }
  };

  const stats = [
    {
      title: 'Total Credits',
      value: systemStatus?.system?.totalCredits || 0,
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      title: 'Active Credits',
      value: systemStatus?.system?.activeCredits || 0,
      icon: <Activity className="w-6 h-6" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      title: 'Retired Credits',
      value: systemStatus?.system?.retiredCredits || 0,
      icon: <Shield className="w-6 h-6" />,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovals?.count || 0,
      icon: <Users className="w-6 h-6" />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    }
  ];

  return (
    <DashboardLayout title="Main Admin Dashboard" role="MAIN_ADMIN">
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Crown className="w-8 h-8 text-yellow-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Main Administrator</h1>
              <p className="text-gray-400">System-wide control and oversight</p>
            </div>
          </div>
          <p className="text-gray-300">
            Welcome back! You have full administrative control over the HydroCred system. 
            Manage country administrators, monitor global activity, and ensure system integrity.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <div className={stat.color}>
                    {stat.icon}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {stat.value.toLocaleString()}
              </h3>
              <p className="text-gray-400 text-sm">{stat.title}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Appoint Country Admin */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Appoint Country Admin</span>
            </h2>
            
            <form onSubmit={handleAppointCountryAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={newAdminAddress}
                  onChange={(e) => setNewAdminAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Admin name"
                  className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organization (Optional)
                </label>
                <input
                  type="text"
                  value={newAdminOrg}
                  onChange={(e) => setNewAdminOrg(e.target.value)}
                  placeholder="Organization name"
                  className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <button
                type="submit"
                disabled={isAppointingAdmin}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAppointingAdmin ? (
                  <LoadingSpinner size="sm" color="text-white" />
                ) : (
                  'Appoint Country Admin'
                )}
              </button>
            </form>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Recent Activity</span>
            </h2>
            
            {analyticsLoading ? (
              <LoadingSpinner size="md" />
            ) : (
              <div className="space-y-3">
                {analytics?.analytics?.recentActivity?.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {activity.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-400 text-center py-4">No recent activity</p>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* System Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>System Information</span>
          </h2>
          
          {statusLoading ? (
            <LoadingSpinner size="md" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-medium text-white mb-2">Contract Address</h3>
                <p className="text-sm text-gray-400 font-mono break-all">
                  {systemStatus?.system?.contractAddress || 'Not deployed'}
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-medium text-white mb-2">Network</h3>
                <p className="text-sm text-gray-400">
                  {systemStatus?.system?.network || 'Unknown'}
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-medium text-white mb-2">Main Admin</h3>
                <p className="text-sm text-gray-400 font-mono break-all">
                  {systemStatus?.system?.mainAdmin || 'Not set'}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default MainAdminDashboard;