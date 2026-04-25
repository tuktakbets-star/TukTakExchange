import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import SplashScreen from './components/SplashScreen';
import { doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';
import './lib/i18n';

// Pages (to be created)
import { motion, AnimatePresence } from 'motion/react';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import ExchangeMoney from './pages/ExchangeMoney';
import SendMoney from './pages/SendMoney';
import CashIn from './pages/CashIn';
import ExchangeRates from './pages/ExchangeRates';
import LiveRates from './pages/LiveRates';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import WaitingPage from './pages/WaitingPage';
import Recharge from './pages/Recharge';
import AddMoney from './pages/AddMoney';
import Appeal from './pages/Appeal';
import AdminPanel from './pages/AdminPanel';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDeposits from './pages/admin/AdminDeposits';
import AdminSendMoney from './pages/admin/AdminSendMoney';
import AdminWithdraw from './pages/admin/AdminWithdraw';
import AdminExchange from './pages/admin/AdminExchange';
import AdminRecharge from './pages/admin/AdminRecharge';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRates from './pages/admin/AdminRates';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminMessages from './pages/admin/AdminMessages';
import AdminDisputes from './pages/admin/AdminDisputes';
import AdminSettings from './pages/admin/AdminSettings';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 flex-col gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-500/50 text-[10px] font-bold uppercase tracking-widest animate-pulse">Securing Connection</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/overview" />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/overview" />;
  }

  return <>{children}</>;
};

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30">
            <AnimatePresence>
              {showSplash && <SplashScreen />}
            </AnimatePresence>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/overview" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/secure-admin-login-987" element={<Auth defaultAdminMode={true} />} />
              <Route path="/live-rates" element={<LiveRates />} />
              
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/exchange" element={<ExchangeMoney />} />
                <Route path="/send" element={<SendMoney />} />
                <Route path="/cash-in" element={<CashIn />} />
                <Route path="/rates" element={<ExchangeRates />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/recharge" element={<Recharge />} />
                <Route path="/add-money" element={<AddMoney />} />
                <Route path="/appeal/:txId" element={<Appeal />} />
                <Route path="/waiting/:txId" element={<WaitingPage />} />
              </Route>
              
              <Route path="/admin-dashboard" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="deposits" element={<AdminDeposits />} />
                <Route path="send-money" element={<AdminSendMoney />} />
                <Route path="exchange" element={<AdminExchange />} />
                <Route path="withdraw" element={<AdminWithdraw />} />
                <Route path="recharge" element={<AdminRecharge />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="rates" element={<AdminRates />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="disputes" element={<AdminDisputes />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            <Toaster position="top-right" theme="dark" closeButton />
          </div>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
