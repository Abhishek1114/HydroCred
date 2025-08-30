import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Shield, Leaf, Users, BarChart3 } from 'lucide-react';
import { apiClient } from '../lib/api';
import { toast } from './Toast';
import LoadingSpinner from './LoadingSpinner';

interface UserRegistrationProps {
  walletAddress: string;
  onRegistrationComplete: (user: any) => void;
}

const UserRegistration: React.FC<UserRegistrationProps> = ({ 
  walletAddress, 
  onRegistrationComplete 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    role: '',
    name: '',
    email: '',
    organization: '',
    location: {
      country: '',
      state: '',
      city: ''
    }
  });

  const roles = [
    {
      value: 'producer',
      label: 'Producer',
      description: 'Generate green hydrogen and request credit certification',
      icon: <Leaf className="h-6 w-6" />,
      color: 'from-green-500 to-emerald-500'
    },
    {
      value: 'buyer',
      label: 'Buyer',
      description: 'Purchase and retire credits for carbon offset',
      icon: <Users className="h-6 w-6" />,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      value: 'certifier',
      label: 'Certifier',
      description: 'Verify production and issue credits (requires admin approval)',
      icon: <Shield className="h-6 w-6" />,
      color: 'from-purple-500 to-pink-500'
    },
    {
      value: 'regulator',
      label: 'Regulator',
      description: 'Monitor and audit the credit system',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'from-orange-500 to-red-500'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role || !formData.name || !formData.organization || 
        !formData.location.country || !formData.location.state || !formData.location.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await apiClient.registerUser({
        walletAddress,
        role: formData.role,
        name: formData.name,
        email: formData.email,
        organization: formData.organization,
        location: formData.location
      });
      
      if (response.success) {
        toast.success('Registration submitted successfully');
        onRegistrationComplete(response.user);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto px-4"
      >
        <div className="card">
          <div className="text-center mb-8">
            <UserPlus className="h-12 w-12 text-brand mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Welcome to HydroCred</h1>
            <p className="text-gray-400">Complete your registration to access the platform</p>
            <p className="text-sm text-gray-500 mt-2">
              Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Role Selection */}
            <div>
              <label className="block text-lg font-medium mb-4">Select Your Role *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((role) => (
                  <motion.div
                    key={role.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.role === role.value
                        ? 'border-brand bg-brand/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${role.color}`}>
                        {role.icon}
                      </div>
                      <h3 className="font-semibold">{role.label}</h3>
                    </div>
                    <p className="text-sm text-gray-400">{role.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Organization *</label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                className="input w-full"
                required
              />
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Country *</label>
                <input
                  type="text"
                  value={formData.location.country}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, country: e.target.value }
                  }))}
                  className="input w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">State *</label>
                <input
                  type="text"
                  value={formData.location.state}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, state: e.target.value }
                  }))}
                  className="input w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">City *</label>
                <input
                  type="text"
                  value={formData.location.city}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, city: e.target.value }
                  }))}
                  className="input w-full"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <h4 className="font-medium text-blue-400 mb-2">Important Notes:</h4>
              <ul className="text-sm text-blue-300 space-y-1">
                <li>• Certifier roles require approval from system administrators</li>
                <li>• All transactions are recorded on the blockchain for transparency</li>
                <li>• Your wallet address will be linked to your profile</li>
                <li>• You can update your information later through your dashboard</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Complete Registration</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default UserRegistration;