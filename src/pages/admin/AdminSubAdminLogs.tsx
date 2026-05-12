import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  User as UserIcon, 
  ExternalLink,
  Clock,
  ArrowUpRight,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  History,
  Eye,
  CreditCard,
  Phone,
  Mail,
  ShieldCheck,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabaseService, where, orderBy } from '@/lib/supabaseService';
import { toast } from 'sonner';

export default function AdminSubAdminLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [logDetails, setLogDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [typeFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const constraints: any[] = [orderBy('timestamp', 'desc')];
      if (typeFilter !== 'all') {
        constraints.push(where('action_type', '==', typeFilter));
      }
      const data = await supabaseService.getCollection('sub_admin_logs', constraints);
      
      const subAdmins = await supabaseService.getCollection('sub_admins');
      const subAdminMap = subAdmins.reduce((acc: any, sub: any) => {
        acc[sub.id] = sub.username;
        return acc;
      }, {});

      const enhancedLogs = (data || []).map(log => ({
        ...log,
        subAdminUsername: subAdminMap[log.sub_admin_id] || 'unknown'
      }));

      setLogs(enhancedLogs);
    } catch (error) {
      toast.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogDetails = async (log: any) => {
    setLoadingDetails(true);
    setLogDetails(null);
    try {
      // 1. Get Transaction Details (Order Info)
      const { data: tx } = await supabaseService.getDocument('transactions', log.order_id);
      
      // 2. Get Sub Admin Details
      const { data: subAdmin } = await supabaseService.getDocument('sub_admins', log.sub_admin_id);
      
      // 3. Get User Details
      let user = null;
      if (log.user_id) {
        const { data: userData } = await supabaseService.getDocument('users', log.user_id);
        user = userData;
      }

      setLogDetails({
        log,
        tx,
        subAdmin,
        user
      });
    } catch (error) {
      toast.error('Failed to load full information');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleLogClick = (log: any) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
    fetchLogDetails(log);
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      log.order_id?.toLowerCase().includes(term) ||
      log.subAdminUsername?.toLowerCase().includes(term) ||
      log.action_type?.toLowerCase().includes(term) ||
      log.status?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-white flex items-center gap-4 group">
            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
               <History className="w-6 h-6 text-blue-500" />
            </div>
            Operator Activity Logs
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm italic uppercase tracking-widest">Real-time audit tracking for all sub-admin operations.</p>
        </div>
        <Button 
          variant="dark" 
          onClick={fetchLogs}
          className="h-11 px-6 rounded-xl font-bold bg-white/5 border-white/5 hover:border-white/10 transition-all uppercase tracking-widest text-[10px]"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh Logs
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
          <Input 
            placeholder="Search by Sub Admin, Order ID, Action..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 bg-white/5 border-white/10 pl-12 rounded-2xl focus:ring-blue-500/20 focus:border-blue-500/40 transition-all font-medium text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full h-12 bg-white/5 border-white/10 pl-12 pr-4 rounded-2xl text-sm font-black uppercase tracking-widest appearance-none focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Action Types</option>
            <option value="add_money">Add Money</option>
            <option value="cash_in">Cash In</option>
            <option value="exchange">Exchange</option>
            <option value="withdraw">Withdraw</option>
            <option value="recharge">Recharge</option>
          </select>
        </div>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select className="w-full h-12 bg-white/5 border-white/10 pl-12 pr-4 rounded-2xl text-sm font-black uppercase tracking-widest appearance-none focus:ring-blue-500 transition-all cursor-pointer">
            <option>All Time</option>
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
          </select>
        </div>
      </div>

      <div className="bg-[#0d1117] border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Loading Audit Logs...</span>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto min-h-[500px]">
           <table className="w-full text-left font-medium border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sub Admin</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Order ID</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Type</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Amount</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {filteredLogs.map((log, idx) => (
                   <tr key={idx} className="hover:bg-white/[0.03] transition-colors group cursor-pointer" onClick={() => handleLogClick(log)}>
                      <td className="px-8 py-6">
                         <div className="flex flex-col">
                            <span className="text-xs text-slate-300 font-bold">{new Date(log.timestamp).toLocaleDateString()}</span>
                            <span className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 font-black text-xs border border-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all">
                               {log.subAdminUsername[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-white tracking-tight italic">@{log.subAdminUsername}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-blue-500 font-bold font-mono text-xs px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            #{log.order_id?.slice(0, 8)}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{log.action_type || log.type}</span>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-sm font-black text-white italic">৳{log.amount?.toLocaleString()}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <Badge className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                            (log.status === 'mark_as_paid' || log.status === 'completed' || log.status === 'approved') 
                              ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                         )}>
                            {log.status?.replace(/_/g, ' ')}
                         </Badge>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="bg-white/5 hover:bg-blue-600 hover:text-white transition-all rounded-xl"
                         >
                            <Eye className="w-4 h-4" />
                         </Button>
                      </td>
                   </tr>
                 ))}
                 {filteredLogs.length === 0 && !loading && (
                   <tr>
                      <td colSpan={7} className="px-8 py-20 text-center">
                         <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10">
                               <Search className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-bold text-white">No activity logs found</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">Try adjusting your filters or search terms to find what you're looking for.</p>
                         </div>
                      </td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl bg-[#0d1117] border-white/10 text-white rounded-[2.5rem] p-0 overflow-hidden outline-none">
          {loadingDetails ? (
            <div className="h-[600px] flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] animate-pulse">Synchronizing Metadata...</p>
            </div>
          ) : logDetails ? (
            <div className="flex flex-col h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="p-8 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent border-b border-white/5 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-display font-black tracking-tight flex items-center gap-3">
                      Order Full Audit
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] bg-blue-500/10 text-blue-500 border-blue-500/20">
                        #{logDetails.tx?.id?.slice(0, 8)}
                      </Badge>
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1 uppercase italic tracking-widest">Detailed cross-reference for compliance tracking.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest",
                      logDetails.tx?.status === 'completed' ? "bg-green-600 text-white" : "bg-blue-600 text-white"
                    )}>
                      {logDetails.tx?.status || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-orange-600/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-[0.1em] text-slate-400">User Information</h3>
                    </div>
                    <Card className="bg-white/[0.02] border-white/5 rounded-3xl overflow-hidden">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-4">
                          <img 
                            src={logDetails.user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${logDetails.user?.uid}`} 
                            alt="avatar" 
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10 shadow-2xl"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="text-lg font-black text-white italic">{logDetails.user?.displayName || logDetails.user?.fullName || 'N/A'}</p>
                            <p className="text-xs font-bold text-slate-500 lowercase tracking-tighter">ID: {logDetails.user?.uid || 'N/A'}</p>
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-1">Pool User Entity</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Phone No.</p>
                            <p className="text-xs font-bold text-white flex items-center gap-2"><Phone className="w-3 h-3 text-slate-600" /> {logDetails.user?.phoneNumber || 'N/A'}</p>
                          </div>
                          <div className="space-y-1 overflow-hidden">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Email Address</p>
                            <p className="text-xs font-bold text-white flex items-center gap-2 truncate text-ellipsis overflow-hidden block w-full"><Mail className="w-3 h-3 text-slate-600" /> {logDetails.user?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center text-red-500 border border-red-500/20">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-[0.1em] text-slate-400">Sub Admin Information</h3>
                    </div>
                    <Card className="bg-white/[0.02] border-white/5 rounded-3xl overflow-hidden shadow-xl shadow-red-600/5">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-red-600/20">
                            {logDetails.subAdmin?.username?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-lg font-black text-white italic">@{logDetails.subAdmin?.username || 'N/A'}</p>
                            <p className="text-xs font-bold text-slate-500">{logDetails.subAdmin?.full_name}</p>
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">Assigned Auditor</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Phone</p>
                            <p className="text-xs font-bold text-white italic">{logDetails.subAdmin?.phone || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Wallet Credit</p>
                            <p className="text-sm font-black text-green-500 tabular-nums italic">৳{logDetails.subAdmin?.wallet_balance?.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>
                </div>

                <div className="space-y-8">
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-[0.1em] text-slate-400">Order & Bank Details</h3>
                    </div>
                    <Card className="bg-white/[0.02] border-white/5 rounded-3xl overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-6 grid grid-cols-2 gap-6 bg-white/[0.01]">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Category</p>
                            <p className="text-sm font-black text-white italic capitalize tracking-widest">{logDetails.tx?.type}</p>
                          </div>
                          <div className="space-y-1 text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transaction Amount</p>
                            <p className="text-xl font-black text-green-500 italic tabular-nums">৳{logDetails.tx?.amount?.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="p-6 border-t border-white/5 space-y-6">
                           <div className="space-y-3">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank / Payment Route</p>
                              {(() => {
                                const info = logDetails.tx?.bankInfo || logDetails.tx?.receiverInfo || logDetails.tx?.bank_info || logDetails.tx?.receiver_info || logDetails.tx;
                                const bank = info?.bankName || info?.bank_name || info?.method || info?.accountType || info?.account_type;
                                const number = info?.accountNumber || info?.account_number || info?.number || info?.account || info?.phoneNumber || info?.account_number;
                                const name = info?.accountName || info?.account_name || info?.name || info?.fullName;

                                return (
                                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                                    <div className="flex justify-between items-center group">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">Method</span>
                                      <span className="text-xs font-black text-blue-400 uppercase italic tracking-widest">{bank || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">ID / Number</span>
                                      <span className="text-sm font-black text-white font-mono tracking-tighter">{number || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">Account Holder</span>
                                      <span className="text-xs font-black text-slate-400 italic">{name || 'N/A'}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">User Payment Proof</p>
                               {logDetails.tx?.userProof || logDetails.tx?.proofUrl || logDetails.tx?.docUrl || logDetails.tx?.kyc_data?.selfie_image || logDetails.tx?.selfieImage ? (
                                 <div className="relative group rounded-2xl overflow-hidden bg-black/50 aspect-square border border-white/5 shadow-2xl">
                                   <img 
                                      src={logDetails.tx.userProof || logDetails.tx.proofUrl || logDetails.tx.docUrl || logDetails.tx.kyc_data?.selfie_image || logDetails.tx.selfieImage} 
                                      alt="User Proof" 
                                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                      referrerPolicy="no-referrer"
                                   />
                                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                      <Button size="xs" variant="ghost" className="text-[10px] font-black text-white italic" onClick={() => window.open(logDetails.tx.userProof || logDetails.tx.proofUrl || logDetails.tx.docUrl || logDetails.tx.kyc_data?.selfie_image || logDetails.tx.selfieImage, '_blank')}>
                                         <Eye className="w-3 h-3 mr-1" /> View High-Res
                                      </Button>
                                   </div>
                                 </div>
                               ) : (
                                 <div className="aspect-square rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-dashed border-white/10 opacity-60">
                                    <ImageIcon className="w-6 h-6 text-slate-600 mb-2" />
                                    <span className="text-[10px] font-bold text-slate-600 italic uppercase">Missing Asset</span>
                                 </div>
                               )}
                             </div>
                             <div className="space-y-2">
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operator Receipt</p>
                               {logDetails.tx?.admin_proof || logDetails.tx?.subAdminProof ? (
                                 <div className="relative group rounded-2xl overflow-hidden bg-black/50 aspect-square border border-white/5 shadow-2xl">
                                   <img 
                                      src={logDetails.tx.admin_proof || logDetails.tx.subAdminProof} 
                                      alt="Admin Proof" 
                                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                      referrerPolicy="no-referrer"
                                   />
                                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                      <Button size="xs" variant="ghost" className="text-[10px] font-black text-white italic" onClick={() => window.open(logDetails.tx.admin_proof || logDetails.tx.subAdminProof, '_blank')}>
                                         <Eye className="w-3 h-3 mr-1" /> View High-Res
                                      </Button>
                                   </div>
                                 </div>
                               ) : (
                                 <div className="aspect-square rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-dashed border-white/10 opacity-60">
                                    <ImageIcon className="w-6 h-6 text-slate-600 mb-2" />
                                    <span className="text-[10px] font-bold text-slate-600 italic uppercase">Not Uploaded</span>
                                 </div>
                               )}
                             </div>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>
                </div>
              </div>

              <div className="mt-auto p-8 bg-[#0d1117] border-t border-white/5">
                 <div className="flex items-center gap-3 mb-6">
                    <History className="w-4 h-4 text-slate-500" />
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Operational Lifecycle Nodes</h4>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 shrink-0">
                          <Clock className="w-5 h-5" />
                       </div>
                       <div className="overflow-hidden">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entry Date</p>
                          <p className="text-xs font-bold text-white truncate">{new Date(logDetails.tx?.timestamp || logDetails.tx?.created_at || logDetails.log?.timestamp).toLocaleString()}</p>
                       </div>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-500 shrink-0">
                          <Clock className="w-5 h-5" />
                       </div>
                       <div className="overflow-hidden">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Audit Claimed</p>
                          <p className="text-xs font-bold text-white truncate">{logDetails.tx?.sub_admin_actioned_at ? new Date(logDetails.tx.sub_admin_actioned_at).toLocaleString() : 'PENDING ACTION'}</p>
                       </div>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-green-600/10 flex items-center justify-center text-green-500 shrink-0">
                          <Clock className="w-5 h-5" />
                       </div>
                       <div className="overflow-hidden">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Final Ledger</p>
                          <p className="text-xs font-bold text-white truncate">{logDetails.tx?.paid_at ? new Date(logDetails.tx.paid_at).toLocaleString() : 'AWAITING FINALITY'}</p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          ) : (
             <div className="h-[400px] flex flex-col items-center justify-center gap-4 p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
                <h3 className="text-xl font-bold font-display italic">Corrupted Data or Missing Reference</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">The order metadata could not be fully reconciled with current blockchain or ledger state. Please verify manually.</p>
                <Button variant="ghost" className="mt-4 rounded-xl px-10 text-[10px] font-black uppercase tracking-widest bg-white/5" onClick={() => setIsDetailModalOpen(false)}>Dismiss Audit</Button>
             </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
