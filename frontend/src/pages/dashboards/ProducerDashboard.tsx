import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../../components/ui/toast';
import { productionAPI, tokensAPI } from '../../lib/api';
import { 
  Factory, 
  Plus, 
  Coins, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  Upload
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import DashboardLayout from '../../components/DashboardLayout';

const ProducerDashboard: React.FC = () => {
  const { addToast } = useToast();
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch producer's tokens
  const { data: tokensData, isLoading: tokensLoading } = useQuery({
    queryKey: ['my-tokens'],
    queryFn: tokensAPI.getMyTokens,
  });

  // Fetch production requests
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['production-requests'],
    queryFn: () => productionAPI.getRequests({ limit: 10 }),
  });

  // Fetch production stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['production-stats'],
    queryFn: productionAPI.getStats,
  });

  const handleSubmitProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      setIsSubmitting(true);
      
      await productionAPI.submitRequest(formData);
      
      addToast({
        type: 'success',
        title: 'Production Request Submitted',
        description: 'Your production request has been submitted for certification'
      });
      
      setShowSubmissionForm(false);
      // Refresh data
      window.location.reload();
      
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit production request'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'CERTIFIED': return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case 'ISSUED': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'REJECTED': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const stats = [
    {
      title: 'Total Tokens',
      value: tokensData?.portfolio?.totalTokens || 0,
      icon: <Coins className="w-6 h-6" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      title: 'Active Tokens',
      value: tokensData?.portfolio?.activeTokens || 0,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      title: 'Retired Tokens',
      value: tokensData?.portfolio?.retiredTokens || 0,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    },
    {
      title: 'Pending Requests',
      value: requestsData?.requests?.filter((r: any) => r.status === 'PENDING').length || 0,
      icon: <Clock className="w-6 h-6" />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    }
  ];

  return (
    <DashboardLayout title="Producer Dashboard" role="PRODUCER">
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Factory className="w-8 h-8 text-green-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Producer Dashboard</h1>
                <p className="text-gray-400">Manage your green hydrogen production and credits</p>
              </div>
            </div>
            <button
              onClick={() => setShowSubmissionForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Production</span>
            </button>
          </div>
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
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {stat.value.toLocaleString()}
              </h3>
              <p className="text-gray-400 text-sm">{stat.title}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
        >
          <h2 className="text-xl font-bold text-white mb-6">Recent Production Requests</h2>
          
          {requestsLoading ? (
            <LoadingSpinner size="md" />
          ) : (
            <div className="space-y-4">
              {requestsData?.requests?.slice(0, 5).map((request: any) => (
                <div
                  key={request.requestId}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-gray-600"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(request.status)}
                    <div>
                      <p className="font-medium text-white">
                        {request.hydrogenAmount} kg H₂
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(request.productionDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {request.status}
                    </p>
                    <p className="text-xs text-gray-400">
                      {request.productionMethod}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-gray-400 text-center py-8">No production requests yet</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Production Submission Modal */}
        {showSubmissionForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-gray-700"
            >
              <h2 className="text-xl font-bold text-white mb-6">Submit Production Request</h2>
              
              <form onSubmit={handleSubmitProduction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hydrogen Amount (kg)
                  </label>
                  <input
                    type="number"
                    name="hydrogenAmount"
                    step="0.01"
                    min="0.01"
                    max="1000"
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Production Date
                  </label>
                  <input
                    type="date"
                    name="productionDate"
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Production Method
                  </label>
                  <select
                    name="productionMethod"
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select method</option>
                    <option value="ELECTROLYSIS">Electrolysis</option>
                    <option value="STEAM_REFORMING">Steam Reforming</option>
                    <option value="BIOMASS_GASIFICATION">Biomass Gasification</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Energy Source
                  </label>
                  <select
                    name="energySource"
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select source</option>
                    <option value="SOLAR">Solar</option>
                    <option value="WIND">Wind</option>
                    <option value="HYDRO">Hydro</option>
                    <option value="GEOTHERMAL">Geothermal</option>
                    <option value="NUCLEAR">Nuclear</option>
                    <option value="MIXED_RENEWABLE">Mixed Renewable</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Documentation
                  </label>
                  <input
                    type="file"
                    name="documents"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                </div>
                
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSubmissionForm(false)}
                    className="flex-1 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <LoadingSpinner size="sm" color="text-white" /> : 'Submit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProducerDashboard;