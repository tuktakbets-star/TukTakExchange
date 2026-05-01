import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  FileText,
  Zap,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabaseService, where, orderBy, limit } from '@/lib/supabaseService';
import { useNavigate } from 'react-router-dom';

export default function OperatorDashboard() {
  const [operator, setOperator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [walletFlow, setWalletFlow] = useState({ credit: 0, debit: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const sessionStr = sessionStorage.getItem('operator_session');
    if (!sessionStr) return;
    
    const session = JSON.parse(sessionStr);
    const { data } = await supabaseService.getDocument('sub_admins', session.id);
    if (data) {
      setOperator(data);
      
      // Fetch: 1. Assigned to me, or 2. Pending and Unassigned
      const allRelevantOrders = await supabaseService.getCollection('transactions', [
        orderBy('created_at', 'desc'),
        limit(20)
      ]);

      const filteredOrders = (allRelevantOrders || []).filter(order => 
        order.assignedSubAdminId === data.id || 
        (order.status === 'pending' && !order.assignedSubAdminId)
      );

      setRecentOrders(filteredOrders.slice(0, 5));

      // Fetch Today's Wallet Flow
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const walletTx = await supabaseService.getCollection('sub_admin_wallet_transactions', [
        where('sub_admin_id', '==', data.id),
        where('created_at', '>=', startOfDay.toISOString())
      ]);

      const flow = (walletTx || []).reduce((acc, tx) => {
        if (tx.type === 'deposit') acc.credit += (tx.amount || 0);
        if (tx.type === 'debit') acc.debit += (tx.amount || 0);
        return acc;
      }, { credit: 0, debit: 0 });

      setWalletFlow(flow);

      // Stats calculation
      const safeAssignments = (allRelevantOrders || []).filter(o => o.assignedSubAdminId === data.id);
      const pendingPublic = (allRelevantOrders || []).filter(o => o.status === 'pending' && !o.assignedSubAdminId).length;
      
      setStats([
        { 
          label: 'My Wallet', 
          value: `৳ ${(data.wallet_balance || 0).toLocaleString()}`, 
          icon: Wallet, 
          color: 'blue',
          sub: 'Available for loading'
        },
        { 
          label: 'Public Pending', 
          value: pendingPublic.toString(), 
          icon: Clock, 
          color: 'amber',
          sub: 'Available to claim'
        },
        { 
          label: 'Success (Me)', 
          value: safeAssignments.filter(a => a.status === 'approved' || a.status === 'completed').length.toString(), 
          icon: CheckCircle2, 
          color: 'green',
          sub: 'Total handled by you'
        },
        { 
          label: 'My Volume', 
          value: `৳ ${safeAssignments.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()}`, 
          icon: CreditCard, 
          color: 'purple',
          sub: 'Your total throughput'
        },
      ]);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-black tracking-tight text-white">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1 font-medium tracking-tight uppercase text-[10px] tracking-[0.2em]">Welcome back, Operator. Stay productive!</p>
      </div>

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={() => navigate('/operator/orders/add-money')}
          className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-600/20 transition-all group"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 group-active:scale-95 transition-transform">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add Money</span>
        </button>
        <button 
          onClick={() => navigate('/operator/orders/withdraw')}
          className="p-4 bg-purple-600/10 border border-purple-500/20 rounded-2xl flex flex-col items-center gap-2 hover:bg-purple-600/20 transition-all group"
        >
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20 group-active:scale-95 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Withdraw</span>
        </button>
        <button 
          onClick={() => navigate('/operator/wallet')}
          className="p-4 bg-green-600/10 border border-green-500/20 rounded-2xl flex flex-col items-center gap-2 hover:bg-green-600/20 transition-all group"
        >
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20 group-active:scale-95 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wallet</span>
        </button>
        <button 
          onClick={() => navigate('/operator/messages')}
          className="p-4 bg-amber-600/10 border border-amber-500/20 rounded-2xl flex flex-col items-center gap-2 hover:bg-amber-600/20 transition-all group"
        >
          <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-600/20 group-active:scale-95 transition-transform">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Support</span>
        </button>
      </div>

      {/* Today's Wallet Flow */}
      <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-600/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 blur-[50px] rounded-full -ml-10 -mb-10" />
        
        <div className="relative flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Today's Wallet Flow</span>
          </div>
          <TrendingUp className="w-5 h-5 opacity-40" />
        </div>

        <div className="space-y-6 relative">
          <div className="flex items-center justify-between group">
            <span className="text-sm font-bold opacity-80 tracking-tight">Total Credit (+)</span>
            <div className="flex items-baseline gap-1">
               <span className="text-xl font-black">+৳{walletFlow.credit.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="h-px bg-white/10 w-full" />
          
          <div className="flex items-center justify-between group">
            <span className="text-sm font-bold opacity-80 tracking-tight">Total Debit (-)</span>
            <div className="flex items-baseline gap-1">
               <span className="text-xl font-black">-৳{walletFlow.debit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => {
              if (stat.label === 'Public Pending') navigate('/operator/orders/add-money');
              if (stat.label === 'My Wallet') navigate('/operator/wallet');
              if (stat.label === 'Success (Me)') navigate('/operator/history');
            }}
            className="group relative p-6 bg-[#161b22] border border-white/5 rounded-[2rem] hover:border-blue-500/30 transition-all duration-500 overflow-hidden cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-lg",
                stat.color === 'blue' ? "bg-blue-600/20 text-blue-400 shadow-blue-600/10" :
                stat.color === 'amber' ? "bg-amber-600/20 text-amber-400 shadow-amber-600/10" :
                stat.color === 'green' ? "bg-green-600/20 text-green-400 shadow-green-600/10" :
                "bg-purple-600/20 text-purple-400 shadow-purple-600/10"
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-slate-800" />
            </div>

            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-white">{stat.value}</h3>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 italic">{stat.sub}</span>
              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                 <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display tracking-tight flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-500" />
              Recent Assignments
            </h2>
            <button 
              onClick={() => navigate('/operator/history')}
              className="text-xs font-bold text-blue-500 hover:underline"
            >
              View All Orders
            </button>
          </div>

          <div className="bg-[#161b22] border border-white/5 rounded-[2rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium text-sm">
                  {recentOrders.length > 0 ? recentOrders.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-blue-400 font-bold font-mono">#{row.id?.slice(0, 8) || 'N/A'}</td>
                      <td className="px-6 py-4 capitalize">{row.type?.replace(/_/g, ' ') || row.type?.replace(/-/g, ' ') || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-300 font-bold">{row.userName || row.uid?.slice(0, 8) || 'User'}</td>
                      <td className="px-6 py-4 text-white font-black">৳{(row.totalAmount || row.amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block",
                          row.status === 'pending' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                          row.status === 'accepted' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                          "bg-green-500/10 text-green-500 border border-green-500/20"
                        )}>
                          {row.status?.replace(/_/g, ' ') || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No assigned orders found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <h2 className="text-xl font-bold font-display tracking-tight flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Performance Rank
          </h2>
          <div className="p-8 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-[2.5rem] text-center relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full transition-transform group-hover:scale-150 duration-1000" />
            
            <div className="relative z-10 space-y-4">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto border border-white/20 shadow-xl backdrop-blur-md">
                 <span className="text-3xl font-black text-white">#04</span>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Top Operator Pool</h3>
                <p className="text-xs text-slate-400 font-medium px-4 leading-relaxed mt-2 uppercase tracking-widest">Maintain 98% approval accuracy to receive bonus wallet loads.</p>
              </div>
              <div className="pt-4 grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Response Time</p>
                   <p className="text-sm font-black text-blue-400">1.2m</p>
                </div>
                <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Accuracy</p>
                   <p className="text-sm font-black text-purple-400">99.2%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
