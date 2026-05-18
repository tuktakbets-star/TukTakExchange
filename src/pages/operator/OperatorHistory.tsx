import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Download,
  Clock,
  CheckCircle2,
  Trash2,
  Eye,
  Info,
  X,
  FileText,
  Calculator
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabaseService, where, orderBy, limit } from '@/lib/supabaseService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ImageViewer } from '@/components/ImageViewer';

export default function OperatorHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalHandled: 0, totalAmount: 0 });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const sessionStr = sessionStorage.getItem('operator_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);

    const constraints = [
      where('assigned_sub_admin_id', '==', session.id),
      orderBy('created_at', 'desc'),
      limit(50)
    ];

    const data = await supabaseService.getCollection('transactions', constraints);
    setHistory(data || []);
    
    // Calculate simple stats
    const totalAmount = (data || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalCommission = (data || []).reduce((acc, curr) => acc + (curr.commission_amount || curr.commissionAmount || 0), 0);
    setStats({
      totalHandled: data?.length || 0,
      totalAmount,
      totalCommission
    });
    
    setLoading(false);
  };

  const filteredHistory = history.filter(row => {
    if (typeFilter !== 'all' && row.type !== typeFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        row.id.toLowerCase().includes(search) ||
        (row.userName && row.userName.toLowerCase().includes(search)) ||
        row.amount.toString().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white">Action History</h1>
          <p className="text-slate-500 mt-1 font-medium text-[10px] sm:text-sm uppercase tracking-widest">Audit trail of all activities</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 sm:p-8 bg-gradient-to-br from-[#161b22] to-slate-900 border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[80px] rounded-full" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1 sm:space-y-2">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Volume Handled</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{stats.totalAmount.toLocaleString()}</h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-600 italic">{stats.totalHandled} orders processed</p>
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600/10 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-blue-500/20">
               <ArrowUpRight className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 0, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 sm:p-8 bg-gradient-to-br from-[#161b22] to-slate-900 border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-600/10 blur-[80px] rounded-full" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1 sm:space-y-2">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Total Commission</p>
              <h3 className="text-2xl sm:text-3xl font-black text-green-500">₫{(stats.totalCommission || 0).toLocaleString()}</h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-600 italic">Earnings summary</p>
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600/10 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-green-500/20">
               <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 sm:p-8 bg-gradient-to-br from-[#161b22] to-slate-900 border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[80px] rounded-full" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1 sm:space-y-2">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Successful</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{history.filter(h => h.status === 'completed' || h.status === 'approved').length}</h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-600 italic">Total successful</p>
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-600/10 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-purple-500/20">
               <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 leading-tight">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search Order ID, user, amount..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 sm:h-12 bg-white/5 border-white/10 pl-11 rounded-2xl text-sm"
          />
        </div>
        <div className="relative">
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full h-11 sm:h-12 bg-white/5 border-white/10 px-4 rounded-2xl text-xs font-bold appearance-none focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="add_money">Add Money</option>
            <option value="cash_in">Cash In</option>
            <option value="exchange">Exchange</option>
            <option value="withdraw">Withdraw</option>
            <option value="recharge">Recharge</option>
          </select>
        </div>
      </div>      <div className="bg-[#161b22] border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl overflow-hidden">
        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto min-h-[400px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date & Time</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Order ID</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">User</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Type</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Amount</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Commission</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Action</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
               {filteredHistory.map((row, idx) => (
                 <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <span className="font-bold text-slate-200">{new Date(row.createdAt || row.created_at).toLocaleDateString()}</span>
                          <span className="text-[9px] font-bold text-slate-600 mt-0.5">{new Date(row.createdAt || row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-blue-400 font-bold font-mono">#{row.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="font-bold text-slate-300 truncate max-w-[120px] inline-block">{row.userName || row.uid?.slice(0, 8)}</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider">{row.type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-base sm:text-lg font-black text-white">
                         {row.currency === 'VND' || row.type === 'cash_in' || row.type === 'add_money' ? '₫' : 
                          row.currency === 'USDT' ? '$' : 
                          row.currency === 'BDT' ? '৳' : '₫'}
                         {row.amount.toLocaleString()}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs font-bold text-green-500">
                         +{(row.commission_amount || row.commissionAmount) ? (row.commission_amount || row.commissionAmount).toLocaleString() : '0'}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-[10px] font-bold text-slate-400 italic capitalize truncate max-w-[100px] inline-block">{row.subAdminAction || 'No action'}</span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3 text-slate-100">
                       <span className={cn(
                         "px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider inline-block border whitespace-nowrap",
                         (row.status === 'approved' || row.status === 'completed') ? "bg-green-500/10 text-green-500 border-green-500/20" :
                         row.status === 'mark_as_paid' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                         row.status === 'accepted' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                         "bg-red-500/10 text-red-500 border-red-500/20"
                       )}>
                          {row.status.replace(/_/g, ' ')}
                       </span>
                       <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 text-[10px] font-bold text-blue-500 bg-blue-500/5 hover:bg-blue-500 hover:text-white rounded-xl border border-blue-500/10 transition-all flex items-center gap-1"
                          onClick={() => setSelectedOrder(row)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Details
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                          onClick={async () => {
                            if (confirm('Permanently delete this record?')) {
                              await supabaseService.deleteDocument('transactions', row.id);
                              window.location.reload();
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                       </div>
                    </td>
                 </tr>
               ))}
               {filteredHistory.length === 0 && (
                 <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">No history records found.</td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-white/5">
          {filteredHistory.length > 0 ? filteredHistory.map((row) => (
            <div key={row.id} className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">#{row.id.substring(0, 8).toUpperCase()}</p>
                  <p className="text-lg font-black text-white">{row.currency === 'VND' ? '₫' : row.currency === 'USDT' ? '$' : '৳'}{row.amount.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-green-500">Commission: +{(row.commission_amount || row.commissionAmount) ? (row.commission_amount || row.commissionAmount).toLocaleString() : '0'}</p>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                  (row.status === 'approved' || row.status === 'completed') ? "bg-green-500/10 text-green-500 border-green-500/20" :
                  row.status === 'mark_as_paid' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                  row.status === 'accepted' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                  "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                  {row.status.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold pt-4 border-t border-white/5">
                <div className="flex flex-col gap-1">
                  <span className="text-purple-400 uppercase tracking-widest">{row.type.replace(/_/g, ' ')}</span>
                  <span className="text-slate-500">{new Date(row.createdAt || row.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="text-slate-400 italic block">{row.subAdminAction || 'No action'}</span>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 text-[10px] font-bold text-blue-500 bg-blue-500/5 rounded-xl border border-blue-500/10"
                      onClick={() => setSelectedOrder(row)}
                    >
                      <Eye className="w-3 h-3 mr-1" /> View Detail
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-8 h-8 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                      onClick={async () => {
                        if (confirm('Permanently delete this record?')) {
                          await supabaseService.deleteDocument('transactions', row.id);
                          window.location.reload();
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-slate-500 italic">No history records found.</div>
          )}
        </div>
        
        <div className="p-6 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 italic">Showing {filteredHistory.length} entries</span>
        </div>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl bg-[#0d1117] border-white/5 text-white p-0 overflow-hidden rounded-[2.5rem]">
          {selectedOrder && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold">Order Details</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedOrder.id}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)} className="text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-white/5 border border-white/5 rounded-3xl space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Status</p>
                    <Badge className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      (selectedOrder.status === 'approved' || selectedOrder.status === 'completed') ? "bg-green-500/10 text-green-500 border-green-500/20" :
                      selectedOrder.status === 'mark_as_paid' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                      "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="p-5 bg-white/5 border border-white/5 rounded-3xl space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Amount</p>
                    <h4 className="text-2xl font-black text-white">
                      {(selectedOrder.currency?.toUpperCase() === 'VND' || selectedOrder.type === 'cash_in' || selectedOrder.type === 'add_money') ? '₫' : 
                       selectedOrder.currency?.toUpperCase() === 'USDT' ? '$' : 
                       selectedOrder.currency?.toUpperCase() === 'BDT' ? '৳' : '₫'}
                      {selectedOrder.amount.toLocaleString()}
                    </h4>
                  </div>
                  {(selectedOrder.commission_amount > 0 || selectedOrder.commissionAmount > 0) && (
                    <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-3xl space-y-1 col-span-2">
                      <p className="text-[10px] font-black text-green-500 uppercase tracking-widest leading-none mb-1">Commission Earned</p>
                      <h4 className="text-xl font-black text-green-500">
                        +₫{(selectedOrder.commission_amount || selectedOrder.commissionAmount).toLocaleString()}
                      </h4>
                    </div>
                  )}
                </div>

                {/* Transaction Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Transaction Information</h4>
                  <div className="p-6 bg-[#161b22] border border-white/5 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-bold">Flow Type</span>
                      <span className="text-purple-400 font-black uppercase tracking-widest">{selectedOrder.type?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-bold">User</span>
                      <span className="text-white font-bold">{selectedOrder.userName || selectedOrder.user_name || selectedOrder.fullName || selectedOrder.uid?.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-bold">Method / Bank</span>
                      <span className="text-white font-bold">
                               {selectedOrder && (() => {
                                  const info = (selectedOrder.bankInfo && (selectedOrder.bankInfo.bankName || selectedOrder.bankInfo.accountNumber || selectedOrder.bankInfo.accountName)) ? selectedOrder.bankInfo : 
                                               (selectedOrder.receiverInfo && (selectedOrder.receiverInfo.name || selectedOrder.receiverInfo.bankName || selectedOrder.receiverInfo.accountNumber)) ? selectedOrder.receiverInfo :
                                               (selectedOrder.bank_info && (selectedOrder.bank_info.bank_name || selectedOrder.bank_info.account_number || selectedOrder.bank_info.account_name)) ? selectedOrder.bank_info :
                                               (selectedOrder.receiver_info && (selectedOrder.receiver_info.name || selectedOrder.receiver_info.bank_name || selectedOrder.receiver_info.account_number)) ? selectedOrder.receiver_info :
                                               selectedOrder;
                                  return info?.bankName || info?.bank_name || info?.method || info?.accountType || info?.account_type || selectedOrder.method || selectedOrder.account_type || selectedOrder.accountType || 'N/A';
                               })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-bold">Account / Card</span>
                      <span className="text-blue-400 font-mono font-bold tracking-widest">
                        {selectedOrder && (() => {
                           const info = (selectedOrder.bankInfo && (selectedOrder.bankInfo.bankName || selectedOrder.bankInfo.accountNumber || selectedOrder.bankInfo.accountName)) ? selectedOrder.bankInfo : 
                                        (selectedOrder.receiverInfo && (selectedOrder.receiverInfo.name || selectedOrder.receiverInfo.bankName || selectedOrder.receiverInfo.accountNumber)) ? selectedOrder.receiverInfo :
                                        (selectedOrder.bank_info && (selectedOrder.bank_info.bank_name || selectedOrder.bank_info.account_number || selectedOrder.bank_info.account_name)) ? selectedOrder.bank_info :
                                        (selectedOrder.receiver_info && (selectedOrder.receiver_info.name || selectedOrder.receiver_info.bank_name || selectedOrder.receiver_info.account_number)) ? selectedOrder.receiver_info :
                                        selectedOrder;
                           const num = info?.accountNumber || info?.account_number || info?.number || info?.account || info?.withdrawal_account_number || info?.account_no || info?.accountNo;
                           return num || 'N/A';
                        })()}
                      </span>
                    </div>

                    {(selectedOrder.sender_number || selectedOrder.senderNumber || selectedOrder.senderPhone) && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-bold">Sender No</span>
                        <span className="text-brand-blue font-mono font-bold">{selectedOrder.sender_number || selectedOrder.senderNumber || selectedOrder.senderPhone}</span>
                      </div>
                    )}

                    {(selectedOrder.transactionId || selectedOrder.transactionCode || selectedOrder.txId || selectedOrder.transaction_id || selectedOrder.transaction_code) && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-bold">Transaction ID</span>
                        <span className="text-amber-500 font-mono font-bold">{selectedOrder.transactionId || selectedOrder.transactionCode || selectedOrder.txId || selectedOrder.transaction_id || selectedOrder.transaction_code}</span>
                      </div>
                    )}
                    {selectedOrder && (() => {
                      const info = (selectedOrder.bankInfo && (selectedOrder.bankInfo.bankName || selectedOrder.bankInfo.accountNumber || selectedOrder.bankInfo.accountName)) ? selectedOrder.bankInfo : 
                                   (selectedOrder.receiverInfo && (selectedOrder.receiverInfo.name || selectedOrder.receiverInfo.bankName || selectedOrder.receiverInfo.accountNumber)) ? selectedOrder.receiverInfo :
                                   (selectedOrder.bank_info && (selectedOrder.bank_info.bank_name || selectedOrder.bank_info.account_number || selectedOrder.bank_info.account_name)) ? selectedOrder.bank_info :
                                   (selectedOrder.receiver_info && (selectedOrder.receiver_info.name || selectedOrder.receiver_info.bank_name || selectedOrder.receiver_info.account_number)) ? selectedOrder.receiver_info :
                                   selectedOrder;
                      
                      const hasDetails = info.name || info.accountName || info.withdrawal_account_name || info.account_name || selectedOrder.targetAmount || selectedOrder.rejection_reason || selectedOrder.description;
                      
                      if (!hasDetails) return null;
                      return (
                        <div className="pt-4 border-t border-white/5 mt-4 space-y-4">
                          {(info.name || info.accountName || info.withdrawal_account_name || info.account_name) && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 font-bold">Account Name</span>
                              <span className="text-white font-bold">{info.name || info.accountName || info.withdrawal_account_name || info.account_name || 'N/A'}</span>
                            </div>
                          )}
                          {selectedOrder.targetAmount && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 font-bold">Target Amount</span>
                              <span className="text-green-400 font-black tracking-tight">{selectedOrder.targetAmount?.toLocaleString()} {selectedOrder.targetCurrency}</span>
                            </div>
                          )}
                          {selectedOrder.rejection_reason && (
                            <div className="flex flex-col gap-1 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                              <span className="text-red-500 font-bold text-[10px] uppercase tracking-widest leading-none">Rejection Reason</span>
                              <span className="text-slate-300 text-xs font-medium">{selectedOrder.rejection_reason}</span>
                            </div>
                          )}
                          {selectedOrder.description && (
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest leading-none">Description / Note</span>
                              <span className="text-slate-300 text-xs italic">"{selectedOrder.description}"</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Proof Photos */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Evidence & Files</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* User Proofs */}
                    {(selectedOrder.userProof || selectedOrder.user_proof || selectedOrder.proofUrl || selectedOrder.proof_url || selectedOrder.proof_uri || selectedOrder.receipt_url) && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-blue-500" /> User Receipt
                        </p>
                        <div 
                          className="aspect-video rounded-3xl bg-black border border-white/10 overflow-hidden cursor-pointer group relative shadow-inner"
                          onClick={() => { setViewerSrc(selectedOrder.userProof || selectedOrder.user_proof || selectedOrder.proofUrl || selectedOrder.proof_url || selectedOrder.proof_uri || selectedOrder.receipt_url); setIsViewerOpen(true); }}
                        >
                          <img src={selectedOrder.userProof || selectedOrder.user_proof || selectedOrder.proofUrl || selectedOrder.proof_url || selectedOrder.proof_uri || selectedOrder.receipt_url} alt="User Proof" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <Eye className="w-8 h-8 text-white scale-90 group-hover:scale-100 transition-transform" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Admin Proofs */}
                    {(selectedOrder.adminProof || selectedOrder.admin_proof || selectedOrder.sub_admin_proof) && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-500" /> Admin/Payment Proof
                        </p>
                        <div 
                          className="aspect-video rounded-3xl bg-black border border-white/10 overflow-hidden cursor-pointer group relative shadow-inner"
                          onClick={() => { setViewerSrc(selectedOrder.adminProof || selectedOrder.admin_proof || selectedOrder.sub_admin_proof); setIsViewerOpen(true); }}
                        >
                          <img src={selectedOrder.adminProof || selectedOrder.admin_proof || selectedOrder.sub_admin_proof} alt="Admin Proof" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-green-600/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <Eye className="w-8 h-8 text-white scale-90 group-hover:scale-100 transition-transform" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* QR Codes */}
                    {(selectedOrder.receiver_info?.qrCode || selectedOrder.receiver_info?.qr_code || selectedOrder.bank_info?.qrCode || selectedOrder.receiverInfo?.qrCode) && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-amber-500" /> Target QR / Wallet
                        </p>
                        <div 
                          className="aspect-video rounded-3xl bg-black border border-white/10 overflow-hidden cursor-pointer group relative shadow-inner"
                          onClick={() => { setViewerSrc(selectedOrder.receiver_info?.qrCode || selectedOrder.receiver_info?.qr_code || selectedOrder.bank_info?.qrCode || selectedOrder.receiverInfo?.qrCode); setIsViewerOpen(true); }}
                        >
                          <img src={selectedOrder.receiver_info?.qrCode || selectedOrder.receiver_info?.qr_code || selectedOrder.bank_info?.qrCode || selectedOrder.receiverInfo?.qrCode} alt="Target QR" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-amber-600/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <Eye className="w-8 h-8 text-white scale-90 group-hover:scale-100 transition-transform" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-blue-500" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-blue-400 leading-tight italic">
                        Operator Action: {selectedOrder.subAdminAction || selectedOrder.sub_admin_action || 'Completed'}
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                        Settled at: {new Date(selectedOrder.updated_at || selectedOrder.paid_at || selectedOrder.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-slate-900/50 border-t border-white/5">
                <Button onClick={() => setSelectedOrder(null)} className="w-full h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase tracking-widest">
                  Close Detail
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <ImageViewer 
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        src={viewerSrc || ''}
      />
    </div>
  );
}

