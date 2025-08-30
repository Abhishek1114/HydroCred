import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { motion } from 'framer-motion';

// Page components
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import MainAdminDashboard from '../pages/dashboards/MainAdminDashboard';
import CountryAdminDashboard from '../pages/dashboards/CountryAdminDashboard';
import StateAdminDashboard from '../pages/dashboards/StateAdminDashboard';
import CityAdminDashboard from '../pages/dashboards/CityAdminDashboard';
import ProducerDashboard from '../pages/dashboards/ProducerDashboard';
import BuyerDashboard from '../pages/dashboards/BuyerDashboard';
import AuditorDashboard from '../pages/dashboards/AuditorDashboard';
import MarketplacePage from '../pages/MarketplacePage';
import TokenDetailsPage from '../pages/TokenDetailsPage';
import LoadingSpinner from './LoadingSpinner';

const AppRoutes: React.FC = () => {
  const { user, isLoading, isConnected } = useWallet();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If not connected or no user, show landing/login
  if (!isConnected || !user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Role-based dashboard routing
  const getDashboardComponent = () => {
    switch (user.role) {
      case 'MAIN_ADMIN':
        return <MainAdminDashboard />;
      case 'COUNTRY_ADMIN':
        return <CountryAdminDashboard />;
      case 'STATE_ADMIN':
        return <StateAdminDashboard />;
      case 'CITY_ADMIN':
        return <CityAdminDashboard />;
      case 'PRODUCER':
        return <ProducerDashboard />;
      case 'BUYER':
        return <BuyerDashboard />;
      case 'AUDITOR':
        return <AuditorDashboard />;
      default:
        return <Navigate to="/login" replace />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Routes>
        <Route path="/" element={getDashboardComponent()} />
        <Route path="/dashboard" element={getDashboardComponent()} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/token/:tokenId" element={<TokenDetailsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </motion.div>
  );
};

export default AppRoutes;