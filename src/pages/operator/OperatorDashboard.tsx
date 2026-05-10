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
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabaseService, where, orderBy, limit } from '@/lib/supabaseService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function OperatorDashboard() {
  const [operator, setOperator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [activeConversations, setActiveConversations] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [walletFlow, setWalletFlow] = useState({ credit: 0, debit: 0 });
  const [lastSeenOrderId, setLastSeenOrderId] = useState<string | null>(null);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!operator?.id) return;
    
    // Subscribe to transactions for real-time notifications
    const unsubscribe = supabaseService.subscribeToCollection('transactions', [
      orderBy('created_at', 'desc'),
      limit(20)
    ], (allOrders) => {
      handleNewOrders(allOrders);
    });

    return () => unsubscribe();
  }, [operator?.id]);

  const handleNewOrders = (allOrders: any[]) => {
    if (!operator) return;
    
    const allowedServices = operator.allowedServices || [];
    const isAllowed = (type: string) => !allowedServices.length || allowedServices.includes(type?.toLowerCase());

    const pendingPublic = allOrders.filter(order => {
      const saId = order.assigned_sub_admin_id || order.assignedSubAdminId;
      return order.status === 'pending' && !saId && isAllowed(order.type);
    });

    setStats(prev => {
      const newStats = [...prev];
      const availIdx = newStats.findIndex(s => s.label.includes('Available'));
      if (availIdx !== -1) {
        newStats[availIdx].value = pendingPublic.length.toString();
      }
      return newStats;
    });

    // Check for NEW order to toast
    if (pendingPublic.length > 0) {
      const latestOrder = pendingPublic[0];
      if (latestOrder.id !== lastSeenOrderId) {
        setLastSeenOrderId(latestOrder.id);
        setHasNewActivity(true);
        
        // Show notification toast
        toast.success(`New ${latestOrder.type?.replace(/_/g, ' ')} order available!`, {
          description: `Order #${latestOrder.id?.slice(0, 8)} for ${(latestOrder.currency?.toUpperCase() === 'VND' || latestOrder.type === 'cash_in' || latestOrder.type === 'add_money') ? '₫' : latestOrder.currency?.toUpperCase() === 'USDT' ? '$' : '৳'}${(latestOrder.amount || 0).toLocaleString()}`,
          duration: 10000,
          action: {
            label: "View All",
            onClick: () => navigate('/operator/orders/exchange') // Generic
          },
          icon: <Zap className="w-5 h-5 text-red-500 animate-pulse" />,
        });
        
        // Refresh full data
        fetchData();
      }
    }
  };

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
        limit(100)
      ]);

      const allowedServices = data.allowedServices || [];
      const isAllowed = (type: string) => !allowedServices.length || allowedServices.includes(type?.toLowerCase());

      const filteredOrders = (allRelevantOrders || []).filter(order => {
        const saId = order.assignedSubAdminId || order.assignedSubAdminId;
        // Show if assigned to me OR if pending and unassigned AND allowed for me
        const isPendingPublic = order.status === 'pending' && !saId;
        return saId === data.id || (isPendingPublic && isAllowed(order.type));
      });

      setRecentOrders(filteredOrders.slice(0, 10));

      // Fetch Today's Wallet Flow
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const walletTx = await supabaseService.getCollection('sub_admin_wallet_transactions', [
        where('sub_admin_id', '==', data.id),
        where('created_at', '>=', startOfDay.toISOString())
      ]);

      const flow = (walletTx || []).reduce((acc, tx) => {
        if (tx.type === 'deposit' || tx.type === 'credit' || tx.type === 'refill' || tx.type === 'adjustment_add' || tx.type === 'bonus') acc.credit += (tx.amount || 0);
        if (tx.type === 'debit' || tx.type === 'withdraw' || tx.type === 'adjustment_sub' || tx.type === 'fee') acc.debit += (tx.amount || 0);
        return acc;
      }, { credit: 0, debit: 0 });

      setWalletFlow(flow);

      // Active Conversations
      const convos = (allRelevantOrders || []).filter(tx => {
        const saId = tx.assignedSubAdminId || tx.assignedSubAdminId;
        return saId === data.id && 
          ['accepted', 'processing', 'paid', 'waiting_confirmation', 'mark_as_paid', 'disputed'].includes(tx.status);
      });
      setActiveConversations(convos);

      // Stats calculation
      const myAssignments = (allRelevantOrders || []).filter(o => (o.assigned_sub_admin_id || o.assignedSubAdminId) === data.id);
      
      const pendingPublicCount = (allRelevantOrders || []).filter(o => 
        o.status === 'pending' && 
        !(o.assigned_sub_admin_id || o.assignedSubAdminId) && 
        isAllowed(o.type)
      ).length;

      const myClaimedCount = myAssignments.filter(o => o.status === 'pending').length;
      const processingMe = myAssignments.filter(o => o.status === 'accepted' || o.status === 'processing').length;
      const waitingMe = myAssignments.filter(o => o.status === 'waiting_confirmation' || o.status === 'mark_as_paid').length;
      const historyMe = myAssignments.filter(o => o.status === 'completed' || o.status === 'approved').length;
      
      setStats([
        { 
          label: 'Available (Public)', 
          value: pendingPublicCount.toString(), 
          icon: Clock, 
          color: 'amber',
          sub: 'Click to claim'
        },
        { 
          label: 'Claimed (Private)', 
          value: myClaimedCount.toString(), 
          icon: FileText, 
          color: 'orange',
          sub: 'Awaiting Accept'
        },
        { 
          label: 'My Active Works', 
          value: processingMe.toString(), 
          icon: Zap, 
          color: 'blue',
          sub: 'Processing/Accepted'
        },
        { 
          label: 'Waiting Confirm', 
          value: waitingMe.toString(), 
          icon: CheckCircle2, 
          color: 'purple',
          sub: 'Awaiting User'
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

  const currencySymbol = operator?.balanceType === 'BDT' ? '৳' : operator?.balanceType === 'USDT' ? '$' : '₫';
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1 font-medium tracking-tight uppercase text-[9px] sm:text-[10px] tracking-[0.2em]">Welcome back, Operator. Stay productive!</p>
        </div>
        {hasNewActivity && (
          <div className="flex items-center gap-2 bg-red-600/10 border border-red-500/20 px-4 py-2 rounded-2xl animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">New Order Available!</span>
          </div>
        )}
      </div>

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {(!operator?.allowed_services?.length || operator?.allowed_services?.includes('add_money')) && (
          <button 
            onClick={() => navigate('/operator/orders/add-money')}
            className="p-3 sm:p-4 bg-green-600/10 border border-green-500/20 rounded-2xl flex flex-col items-center gap-2 hover:bg-green-600/20 transition-all group"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20 group-active:scale-95 transition-transform">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add Money</span>
          </button>
        )}
        {(!operator?.allowed_services?.length || operator?.allowed_services?.includes('withdraw')) && (
          <button 
            onClick={() => navigate('/operator/orders/withdraw')}
            className="p-3 sm:p-4 bg-purple-600/10 border border-purple-500/20 rounded-2xl flex flex-col items-center gap-2 hover:bg-purple-600/20 transition-all group"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20 group-active:scale-95 transition-transform">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Withdraw</span>
          </button>
        )}
        {(!operator?.allowed_services?.length || operator?.allowed_services?.includes('exchange')) && (
          <button 
            onClick={() => navigate('/operator/orders/exchange')}
            className="p-3 sm:p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-600/20 transition-all group"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 group-active:scale-95 transition-transform">
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exchange</span>
          </button>
        )}
        <button 
          onClick={() => navigate('/operator/messages')}
          className="p-3 sm:p-4 bg-amber-600/10 border border-amber-500/20 rounded-2xl flex flex-col items-center gap-2 hover:bg-amber-600/20 transition-all group relative"
        >
          {activeConversations.length > 0 && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          )}
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-600/20 group-active:scale-95 transition-transform">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Support Chat</span>
        </button>
      </div>

      {/* Today's Wallet Flow */}
      <div className="bg-blue-600 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-600/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 blur-[50px] rounded-full -ml-10 -mb-10" />
        
        <div className="relative flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] opacity-80">Today's Wallet Flow</span>
          </div>
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 opacity-40" />
        </div>

        <div className="space-y-4 sm:space-y-6 relative">
          <div className="flex items-center justify-between group">
            <span className="text-xs sm:text-sm font-bold opacity-80 tracking-tight">Total Credit (+)</span>
            <div className="flex items-baseline gap-1">
               <span className="text-lg sm:text-xl font-black">+{currencySymbol}{walletFlow.credit.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="h-px bg-white/10 w-full" />
          
          <div className="flex items-center justify-between group">
            <span className="text-xs sm:text-sm font-bold opacity-80 tracking-tight">Total Debit (-)</span>
            <div className="flex items-baseline gap-1">
               <span className="text-lg sm:text-xl font-black">-{currencySymbol}{walletFlow.debit.toLocaleString()}</span>
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
              const allowed = operator?.allowed_services || [];
              const canAccess = (type: string) => !allowed.length || allowed.includes(type);

              if (stat.label.includes('Available') || stat.label.includes('Claimed') || stat.label.includes('Active')) {
                // Try to navigate to a page that actually has orders of this type
                const orderTypes = ['add_money', 'withdraw', 'exchange', 'recharge', 'cash_in'];
                const bestService = orderTypes.find(type => canAccess(type));
                
                if (bestService) {
                  const slug = bestService.replace('_', '-');
                  navigate(`/operator/orders/${slug}`);
                }
              }
              if (stat.label === 'My Wallet') navigate('/operator/wallet');
              if (stat.label === 'History (Total)' || stat.label.includes('History')) navigate('/operator/history');
            }}
            className={cn(
              "group relative p-6 bg-[#161b22] border border-white/5 rounded-[2rem] hover:border-blue-500/30 transition-all duration-500 overflow-hidden cursor-pointer",
              stat.label === 'Available (Public)' && Number(stat.value) > 0 && "ring-2 ring-red-500 ring-offset-2 ring-offset-[#0d1117] animate-pulse"
            )}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-lg",
                stat.color === 'blue' ? "bg-blue-600/20 text-blue-400 shadow-blue-600/10" :
                stat.color === 'amber' ? "bg-amber-600/20 text-amber-400 shadow-amber-600/10" :
                stat.color === 'green' ? "bg-green-600/20 text-green-400 shadow-green-600/10" :
                "bg-purple-600/20 text-purple-400 shadow-purple-600/10"
              )}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-slate-800" />
            </div>

            <div className="space-y-1">
              <p className="text-slate-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-xl sm:text-2xl font-black text-white">{stat.value}</h3>
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

      {/* Active Client Chats */}
      {activeConversations.length > 0 && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-blue-500 uppercase tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Active Order Chats ({activeConversations.length})
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Recent communication with assigned clients</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeConversations.map((item) => (
              <div 
                key={item.id}
                onClick={() => navigate(`/operator/appeal/${item.id}`)}
                className="group p-5 border rounded-3xl transition-all cursor-pointer relative overflow-hidden bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10"
              >
                <div className="absolute top-0 right-0 p-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform bg-blue-500/10 text-blue-500">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-blue-500/50">
                      Transaction #{item.id?.slice(0, 8)}
                    </p>
                    <h4 className="font-bold text-white truncate pr-10">{item.userName || item.name || 'Client'}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] font-bold border-0 bg-blue-500/10 text-blue-400">
                      {(item.currency?.toUpperCase() === 'VND' || item.type === 'cash_in' || item.type === 'add_money') ? '₫' : item.currency?.toUpperCase() === 'USDT' ? '$' : '৳'}{(item.amount || item.totalAmount || 0).toLocaleString()}
                    </Badge>
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded border",
                      item.status === 'paid' || item.status === 'waiting_confirmation' ? "text-green-500 border-green-500/20 bg-green-500/5" : 
                      item.status === 'disputed' ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
                      "text-blue-400 border-blue-400/10"
                    )}>
                      {item.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Order ID</th>
                    <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Type</th>
                    <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">User</th>
                    <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Amount</th>
                    <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium text-xs sm:text-sm">
                  {recentOrders.length > 0 ? recentOrders.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-blue-400 font-bold font-mono">#{row.id?.slice(0, 8) || 'N/A'}</td>
                      <td className="px-6 py-4 capitalize whitespace-nowrap">{row.type?.replace(/_/g, ' ') || row.type?.replace(/-/g, ' ') || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="text-slate-300 font-bold truncate max-w-[120px]">{row.userName || row.uid?.slice(0, 8) || 'User'}</span>
                           {(row.status === 'accepted' || row.status === 'paid' || row.status === 'processing') && (
                             <button 
                               onClick={() => navigate(`/operator/appeal/${row.id}`)}
                               className="p-1.5 hover:bg-blue-500/20 rounded-md text-blue-500 transition-colors"
                             >
                               <MessageSquare className="w-4 h-4" />
                             </button>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white font-black whitespace-nowrap">{(row.currency?.toUpperCase() === 'VND' || row.type === 'cash_in' || row.type === 'add_money') ? '₫' : row.currency?.toUpperCase() === 'USDT' ? '$' : '৳'}{(row.totalAmount || row.amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider inline-block whitespace-nowrap",
                          (row.status === 'pending' && !row.assigned_sub_admin_id) ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                          (row.status === 'pending' && row.assigned_sub_admin_id) ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                          row.status === 'accepted' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                          row.status === 'processing' ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20" :
                          (row.status === 'waiting_confirmation' || row.status === 'mark_as_paid') ? "bg-purple-500/10 text-purple-500 border border-purple-500/20" :
                          "bg-green-500/10 text-green-500 border border-green-500/20"
                        )}>
                          {(row.status === 'pending' && row.assigned_sub_admin_id) ? 'ASSIGNED' : row.status?.replace(/_/g, ' ') || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 text-[10px] font-bold text-blue-500 bg-blue-500/5 hover:bg-blue-500 hover:text-white rounded-xl border border-blue-500/10 transition-all font-display tracking-tight"
                          onClick={() => navigate('/operator/history')}
                        >
                          View Details
                        </Button>
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
