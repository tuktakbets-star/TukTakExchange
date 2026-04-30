import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Maximize2, 
  CheckCircle2, 
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  FileImage
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabaseService, where, orderBy } from '@/lib/supabaseService';

export default function OperatorAddMoney({ type = 'add_money' }: { type?: 'add_money' | 'cash_in' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    const sessionStr = sessionStorage.getItem('operator_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);

    const { data: opData } = await supabaseService.getDocument('sub_admins', session.id);
    if (opData) setOperator(opData);

    const constraints = [
      where('type', '==', type),
      orderBy('created_at', 'desc')
    ];
    if (statusFilter !== 'all') {
      constraints.push(where('status', '==', statusFilter));
    }

    const data = await supabaseService.getCollection('transactions', constraints);
    setOrders(data || []);
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedOrder || !operator) return;
    
    setLoading(true);
    try {
      // Re-fetch operator to get the latest balance and avoid race conditions
      const { data: latestOp } = await supabaseService.getDocument('sub_admins', operator.id);
      if (!latestOp) {
        toast.error('Operator not found');
        return;
      }
      setOperator(latestOp);

      if ((latestOp.wallet_balance || 0) < selectedOrder.amount) {
        toast.error('Insufficient wallet balance to approve this order. Please contact admin to load your wallet.', {
          duration: 5000
        });
        return;
      }

      toast.loading('Processing approval...', { id: 'approve' });
      
      // 1. Update order status
      await supabaseService.updateDocument('transactions', selectedOrder.id, {
        status: 'approved',
        assigned_sub_admin_id: latestOp.id,
        sub_admin_action: 'approved',
        sub_admin_actioned_at: new Date().toISOString()
      });

      // 2. Update user balance
      const { data: userData } = await supabaseService.getDocument('users', selectedOrder.uid);
      if (userData) {
        await supabaseService.updateDocument('users', selectedOrder.uid, {
          wallet_balance: (userData.walletBalance || 0) + selectedOrder.amount
        });
      }

      // 3. Deduct from operator wallet & Log
      const newOpBalance = (latestOp.wallet_balance || 0) - selectedOrder.amount;
      await supabaseService.updateDocument('sub_admins', latestOp.id, {
        wallet_balance: newOpBalance
      });

      await supabaseService.addDocument('sub_admin_wallet_transactions', {
        sub_admin_id: latestOp.id,
        type: 'debit',
        amount: selectedOrder.amount,
        reason: `${type === 'add_money' ? 'Add Money' : 'Cash In'} approved for ${selectedOrder.uid}`,
        order_id: selectedOrder.id,
        balance_after: newOpBalance,
        created_at: new Date().toISOString()
      });

      toast.success(`Successfully approved ৳${selectedOrder.amount}`, { id: 'approve' });
      setIsApproveConfirmOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Approval failed', { id: 'approve' });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder || !rejectionReason) {
      toast.error('Please enter a reason for rejection');
      return;
    }
    toast.loading('Processing rejection...', { id: 'reject' });
    
    try {
      await supabaseService.updateDocument('transactions', selectedOrder.id, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        assigned_sub_admin_id: operator.id,
        sub_admin_action: 'rejected',
        sub_admin_actioned_at: new Date().toISOString()
      });
      
      toast.success('Order rejected', { id: 'reject' });
      setIsRejectModalOpen(false);
      setRejectionReason('');
      fetchData();
    } catch (error) {
      toast.error('Rejection failed', { id: 'reject' });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-white">
            {type === 'add_money' ? 'Add Money Orders' : 'Cash In Orders'}
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Review payments and update user balances.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="dark" className="h-10 text-xs font-bold border border-white/5 rounded-xl">
             <Download className="w-3.5 h-3.5 mr-2" />
             Export CSV
           </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search by Order ID, username, phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 bg-white/5 border-white/10 pl-12 rounded-2xl"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select className="w-full h-12 bg-white/5 border-white/10 pl-12 pr-4 rounded-2xl text-sm font-medium appearance-none focus:ring-blue-500 transition-all cursor-pointer">
            <option value="all">Any Date</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-12 bg-white/5 border-white/10 pl-12 pr-4 rounded-2xl text-sm font-medium appearance-none focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#161b22] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order Details</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User Info</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proof</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {orders
                  .filter(o => (o.assignedSubAdminId === operator?.id || !o.assignedSubAdminId))
                  .filter(o => statusFilter === 'all' || o.status === statusFilter)
                  .map((order, idx) => (
                  <motion.tr 
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-blue-400 font-bold font-mono tracking-tight">#{order.id}</span>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">
                           {new Date(order.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-500">
                           {order?.userName?.[0] || '?'}
                         </div>
                         <div className="flex flex-col">
                           <span className="font-bold text-sm tracking-tight">{order?.userName || 'User'}</span>
                           <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{order?.paymentMethod || 'BANK'}</span>
                         </div>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-lg font-black text-white">৳{order.amount}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block border",
                        order.status === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        order.status === 'approved' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                       <button 
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsProofModalOpen(true);
                        }}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:bg-blue-600/10 hover:text-blue-500 transition-all"
                       >
                         <Eye className="w-4 h-4" />
                       </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {order.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                           <Button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsApproveConfirmOpen(true);
                            }}
                            className="h-9 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold"
                           >
                             Approve
                           </Button>
                           <Button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsRejectModalOpen(true);
                            }}
                            variant="dark" 
                            className="h-9 px-4 bg-[#ef4444]/10 text-red-500 border-red-500/20 hover:bg-red-500/20 rounded-xl text-xs font-bold"
                           >
                             Reject
                           </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Action Taken</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between">
           <p className="text-xs text-slate-500 font-bold px-4">Showing 1-2 of 2 orders</p>
           <div className="flex items-center gap-1">
             <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg"><ChevronLeft className="w-4 h-4" /></Button>
             <Button variant="dark" size="sm" className="h-8 w-8 p-0 rounded-lg text-xs font-bold bg-blue-600 text-white border-0">1</Button>
             <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg"><ChevronRight className="w-4 h-4" /></Button>
           </div>
        </div>
      </div>

      {/* Proof Modal */}
      <Dialog open={isProofModalOpen} onOpenChange={setIsProofModalOpen}>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-white p-0 overflow-hidden rounded-[2.5rem]">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileImage className="w-5 h-5 text-blue-500" />
              <div>
                <DialogTitle className="text-lg font-bold">Payment Proof - #{selectedOrder?.id}</DialogTitle>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uploaded by {selectedOrder?.userName}</p>
              </div>
            </div>
            <Button variant="dark" className="h-9 rounded-xl text-xs" onClick={() => window.open(selectedOrder?.proofUrl, '_blank')}>
              <Maximize2 className="w-3.5 h-3.5 mr-2" />
              Fullscreen
            </Button>
          </div>
          <div className="bg-black/40 p-4 flex items-center justify-center min-h-[400px]">
             {selectedOrder?.proofUrl ? (
               <img src={selectedOrder.proofUrl} alt="Proof" className="max-h-[600px] rounded-2xl shadow-2xl object-contain" />
             ) : (
               <div className="text-center p-20 opacity-20">No proof image available</div>
             )}
          </div>
          <div className="p-6 bg-[#0d1117] flex justify-between items-center">
             <div className="flex flex-col">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">User Paid Amount</span>
               <span className="text-2xl font-black text-white">৳{selectedOrder?.amount}</span>
             </div>
             <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setIsProofModalOpen(false);
                    setIsApproveConfirmOpen(true);
                  }}
                  disabled={selectedOrder?.status !== 'pending'}
                  className="h-12 px-8 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold"
                >
                  Approve Now
                </Button>
                <Button 
                  onClick={() => {
                    setIsProofModalOpen(false);
                    setIsRejectModalOpen(true);
                  }}
                  disabled={selectedOrder?.status !== 'pending'}
                  variant="dark" 
                  className="h-12 px-8 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-xl font-bold"
                >
                  Reject
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display tracking-tight text-red-500">Reject This Order?</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
             <p className="text-sm text-slate-400 leading-relaxed font-medium">Please provide a clear reason for the user why this payment was rejected.</p>
             <div className="space-y-2">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Rejection Reason</label>
               <textarea 
                placeholder="e.g., Transparent proof not found, Fake screenshot, Transaction ID mismatch..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full h-32 bg-white/5 border-white/10 rounded-2xl p-4 text-sm font-medium focus:ring-red-500 transition-all resize-none"
               />
             </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)} className="h-12 flex-1 rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleReject} className="h-12 flex-1 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold">Reject Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation */}
      <Dialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-[2rem]">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-display font-black tracking-tight mb-4">Confirm Approval?</h2>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4 text-left">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">User to Receive:</span>
                 <span className="text-white font-black text-lg">৳{selectedOrder?.amount}</span>
               </div>
               <div className="flex justify-between items-center text-sm border-t border-white/5 pt-4">
                 <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Wallet Deduction:</span>
                 <span className="text-red-400 font-black text-lg">-৳{selectedOrder?.amount}</span>
               </div>
               {operator && (operator.wallet_balance || 0) < selectedOrder?.amount && (
                 <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 mt-2">
                   <AlertTriangle className="w-4 h-4 text-red-500" />
                   <p className="text-[10px] text-red-500 font-black uppercase">Insufficient Balance</p>
                 </div>
               )}
            </div>
            
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex gap-3 text-left">
               <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
               <p className="text-[10px] text-yellow-500 leading-tight font-bold uppercase italic">
                 Warning: This action will instantly update user's balance. Ensure you've received the money in your personal collection wallet.
               </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
             <Button variant="ghost" onClick={() => setIsApproveConfirmOpen(false)} className="h-12 flex-1 rounded-xl font-bold">Cancel</Button>
             <Button 
               onClick={handleApprove} 
               disabled={loading || (operator && (operator.wallet_balance || 0) < selectedOrder?.amount)}
               className="h-12 flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-xl shadow-green-600/20 disabled:opacity-50 disabled:grayscale"
             >
               {loading ? 'Processing...' : 'Yes, Approve Now'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
