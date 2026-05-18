import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  FileImage,
  Camera,
  FileText,
  Clock,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isPaidConfirmOpen, setIsPaidConfirmOpen] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [statusFilter, type]);

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
    if (statusFilter === 'pending') {
      // Fetch pending, accepted, processing, and waiting confirmation
      constraints.push(where('status', 'in', ['pending', 'accepted', 'processing', 'waiting_confirmation', 'mark_as_paid']));
    } else if (statusFilter !== 'all') {
      constraints.push(where('status', '==', statusFilter));
    }
    
    // Custom filter logic
    const data = await supabaseService.getCollection('transactions', constraints);
    setOrders(data || []);
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!selectedOrder || !operator) return;
    
    // Check if operator has enough balance before accepting/claiming
    const amount = Number(selectedOrder.amount || 0);
    const saBalance = Number(operator?.walletBalance || 0);
    
    if (saBalance < amount) {
      toast.error(`Insufficient balance to claim this order! You need ₫${amount.toLocaleString()}, but have ₫${saBalance.toLocaleString()}.`, {
        duration: 5000
      });
      setIsAcceptConfirmOpen(false);
      return;
    }

    toast.loading('Claiming order...', { id: 'accept' });
    
    try {
      const res = await supabaseService.claimOrder(selectedOrder.id, operator.id);
      
      if (res.success) {
        toast.success('Order claimed successfully!', { id: 'accept' });
        const updatedOrder = { ...selectedOrder, status: 'accepted', assigned_sub_admin_id: operator.id };
        setSelectedOrder(updatedOrder);
        setOrders((prev: any[]) => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
        setIsAcceptConfirmOpen(false);
        setIsStartConfirmOpen(true);
      } else {
        toast.error(res.message || 'Failed to claim order', { id: 'accept' });
        setIsAcceptConfirmOpen(false);
      }
      
      fetchData();
    } catch (error) {
      toast.error('Unexpected error while claiming', { id: 'accept' });
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedOrder || !operator) return;

    // Verify ownership before starting
    const { data: currentOrder } = await supabaseService.getDocument('transactions', selectedOrder.id);
    const assignedId = currentOrder?.assigned_sub_admin_id || currentOrder?.assignedSubAdminId;
    
    if (assignedId && assignedId !== operator.id) {
      toast.error('This order is assigned to another operator!', { id: 'start' });
      setIsStartConfirmOpen(false);
      fetchData();
      return;
    }

    toast.loading('Starting processing...', { id: 'start' });
    
    try {
      await supabaseService.updateDocument('transactions', selectedOrder.id, {
        status: 'processing',
        updated_at: new Date().toISOString()
      });
      
      toast.success('Task started. You can now mark it as paid once done.', { id: 'start' });
      setIsStartConfirmOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to start task', { id: 'start' });
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedOrder || !operator) return;
    
    // Verify ownership before finalizing
    const { data: currentOrder } = await supabaseService.getDocument('transactions', selectedOrder.id);
    const assignedId = currentOrder?.assigned_sub_admin_id || currentOrder?.assignedSubAdminId;
    
    if (assignedId && assignedId !== operator.id) {
      toast.error('This order is assigned to another operator!', { id: 'paid' });
      setIsSubmitting(false);
      setIsPaidConfirmOpen(false);
      fetchData();
      return;
    }

    setIsSubmitting(true);
    toast.loading('Finalizing transaction...', { id: 'paid' });
    
    try {
      const amount = Number(selectedOrder.amount || 0);
      
      // Check if operator has enough balance
      if (Number(operator?.walletBalance || 0) < amount) {
        toast.error('Insufficient working balance! Please refill your wallet.', { id: 'paid' });
        setIsSubmitting(false);
        return;
      }

      let adminProofUrl = ''; 
      if (proofFile) {
        adminProofUrl = await supabaseService.uploadFile(proofFile);
      }
      
      // AUTO-COMPLETE Workflow for Add Money / Cash In
      // 1. Update User Balance (Increase)
      const uRes = await supabaseService.updateWalletBalance(selectedOrder.uid, selectedOrder.currency, amount, 0);

      if (!uRes) {
        setIsSubmitting(false);
        return; // supabaseService.updateWalletBalance already shows toast error via updateDocument
      }

      // 2. Update Sub-Admin Balance (Deduct Order Amount)
      const currentSaBal = Number(operator.walletBalance || 0);
      const balanceAfterDeduction = currentSaBal - amount;
      
      const saRes = await supabaseService.updateDocument('sub_admins', operator.id, {
        wallet_balance: balanceAfterDeduction,
        updated_at: new Date().toISOString()
      });

      if (!saRes.success) {
        setIsSubmitting(false);
        return;
      }

      // 3. Record transaction with proof_url (Deduction of the full amount)
      await supabaseService.addDocument('sub_admin_wallet_transactions', {
        sub_admin_id: operator.id,
        type: 'debit',
        amount: amount,
        reason: `Order #${selectedOrder.id} finalized (Deduction)`,
        order_id: selectedOrder.id,
        balance_after: balanceAfterDeduction,
        created_at: new Date().toISOString(),
        proof_url: adminProofUrl || selectedOrder.proof_url
      });

      // 3.1 Process Commission (This adds commission to the balanceAfterDeduction)
      await supabaseService.processSubAdminCommission(selectedOrder, balanceAfterDeduction);
      const txRes = await supabaseService.updateDocument('transactions', selectedOrder.id, {
        status: 'completed',
        admin_proof: adminProofUrl || null,
        sub_admin_action: 'finalize_completed',
        sub_admin_actioned_at: new Date().toISOString(),
        assigned_sub_admin_id: operator.id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (!txRes.success) {
        setIsSubmitting(false);
        return;
      }

      // 5. Log Sub-Admin Activity
      await supabaseService.addDocument('sub_admin_logs', {
        sub_admin_id: operator.id,
        action_type: type,
        order_id: selectedOrder.id,
        user_id: selectedOrder.uid,
        amount: amount,
        status: 'completed',
        timestamp: new Date().toISOString()
      });

      toast.success(`Transaction completed! User balance updated automatically.`, { id: 'paid' });
      setIsPaidConfirmOpen(false);
      fetchData();
    } catch (error) {
      console.error('Finalize Error:', error);
      toast.error('Failed to complete transaction', { id: 'paid' });
    } finally {
      setIsSubmitting(false);
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

      // Log Rejection
      await supabaseService.addDocument('sub_admin_logs', {
        sub_admin_id: operator.id,
        action_type: type,
        order_id: selectedOrder.id,
        user_id: selectedOrder.uid,
        amount: selectedOrder.amount,
        status: 'rejected',
        note: rejectionReason,
        timestamp: new Date().toISOString()
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
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white capitalize">
            {type === 'add_money' ? 'Add Money' : 'Cash In'}
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-[10px] sm:text-sm uppercase tracking-widest">Review and update balances</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Order ID / user / phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 sm:h-12 bg-white/5 border-white/10 pl-11 rounded-2xl text-sm"
          />
        </div>
        <div className="relative">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-11 sm:h-12 bg-white/5 border-white/10 px-4 rounded-2xl text-xs font-bold appearance-none focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="pending">Tasks (Ongoing)</option>
            <option value="waiting_confirmation">Awaiting Confirm</option>
            <option value="completed">Success (Finished)</option>
            <option value="rejected">Rejected</option>
            <option value="all">Every Order</option>
          </select>
        </div>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto min-h-[400px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Order Details</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">User Info</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Amount</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-green-500">Commission</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Proof</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {orders
                  .filter(o => {
                    if (statusFilter === 'pending') {
                      return o.status === 'pending' || o.status === 'accepted' || o.status === 'processing' || o.status === 'waiting_confirmation' || o.status === 'mark_as_paid';
                    }
                    if (statusFilter === 'all') return true;
                    return o.status === statusFilter;
                  })
                  .filter(o => {
                    const saId = o.assigned_sub_admin_id || o.assignedSubAdminId;
                    const isMine = saId === operator?.id;
                    const isUnassigned = !saId;
                    const isOther = saId && saId !== operator?.id;

                    const allowed = operator?.allowedServices || [];
                    const isAllowed = !allowed.length || allowed.includes(o.type?.toLowerCase());

                    // Filter Logic:
                    // 1. Must be an allowed service type
                    // 2. Must either be assigned to me OR be unassigned (public)
                    return isAllowed && !isOther;
                  })
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
                        <span className="text-blue-400 font-bold font-mono tracking-tight text-xs">#{order.id.slice(0, 8)}</span>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">
                           {new Date(order.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
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
                       <div className="flex flex-col">
                         <span className="text-xl font-black text-white">{(order.currency === 'VND' || order.type === 'cash_in' || order.type === 'add_money') ? '₫' : order.currency === 'USDT' ? '$' : '৳'}{order.amount}</span>
                         <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{order.method || order.paymentMethod}</span>
                         {order.source_info && <span className="text-[9px] text-blue-500 font-bold mt-1">From: {order.source_info}</span>}
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex flex-col gap-1">
                          <Badge className={cn(
                            "rounded-lg px-2 py-0.5 text-[10px] uppercase font-bold",
                            (order.status === 'pending' && !order.assigned_sub_admin_id) && "bg-yellow-500/10 text-yellow-500",
                            (order.status === 'pending' && order.assigned_sub_admin_id) && "bg-orange-500/10 text-orange-500",
                            order.status === 'accepted' && "bg-blue-500/10 text-blue-500",
                            order.status === 'processing' && "bg-indigo-500/10 text-indigo-500",
                            (order.status === 'waiting_confirmation' || order.status === 'mark_as_paid') && "bg-purple-500/10 text-purple-500",
                            (order.status === 'completed' || order.status === 'approved') && "bg-green-500/10 text-green-500",
                            order.status === 'disputed' && "bg-red-500/10 text-red-500"
                          )}>
                            {(order.status === 'waiting_confirmation' || order.status === 'mark_as_paid') ? 'WAITING USER' : 
                             (order.status === 'pending' && order.assigned_sub_admin_id) ? 'ASSIGNED' :
                             order.status === 'accepted' ? 'CLAIMED' :
                             order.status?.toUpperCase()}
                          </Badge>
                          <span className="text-[9px] font-mono text-slate-600 truncate max-w-[100px]">{order.senderNumber || order.sender_number || 'No Phone'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex flex-col">
                         {order.commission_amount || order.commissionAmount ? (
                           <span className="text-green-500 font-bold">₫{(order.commission_amount || order.commissionAmount).toLocaleString()}</span>
                         ) : (
                           <span className="text-slate-500 text-xs">-</span>
                         )}
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <button 
                        onClick={() => {
                          setSelectedOrder({
                            ...order,
                            proofUrl: order.userProof || order.proofUrl || order.docUrl || order.adminProof
                          });
                          setIsProofModalOpen(true);
                        }}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:bg-blue-600/10 hover:text-blue-500 transition-all group-hover:border-blue-500/30"
                       >
                         <Eye className="w-4 h-4" />
                       </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {(order.status === 'pending' || order.status === 'accepted' || order.status === 'processing') ? (
                        <div className="flex items-center justify-end gap-2">
                           {order.status === 'pending' && !(order.assigned_sub_admin_id || order.assignedSubAdminId) && (
                             <Button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsAcceptConfirmOpen(true);
                              }}
                              className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                             >
                                Accept
                             </Button>
                           )}
                           {order.status === 'pending' && (order.assigned_sub_admin_id === operator?.id || order.assignedSubAdminId === operator?.id) && (
                             <Button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsAcceptConfirmOpen(true);
                              }}
                              className="h-9 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
                             >
                                Confirm Claim
                             </Button>
                           )}
                           {order.status === 'accepted' && (
                             <Button 
                               onClick={() => {
                                 setSelectedOrder(order);
                                 setIsStartConfirmOpen(true);
                               }}
                               className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                             >
                                Start Task
                             </Button>
                           )}
                           {order.status === 'processing' && (
                             <Button 
                               onClick={() => {
                                 setSelectedOrder(order);
                                 setIsPaidConfirmOpen(true);
                               }}
                               className="h-9 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold"
                             >
                                Finalize
                             </Button>
                           )}
                           {(order.status === 'accepted' || order.status === 'processing' || order.status === 'waiting_confirmation' || order.status === 'mark_as_paid') && (
                             <Button 
                               onClick={() => navigate(`/operator/appeal/${order.id}`)}
                               variant="ghost"
                               className="h-9 w-9 p-0 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white rounded-xl transition-all ml-1"
                               title="Message Client"
                             >
                               <MessageSquare className="w-4 h-4" />
                             </Button>
                           )}
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

        {/* Mobile View */}
        <div className="lg:hidden space-y-4 p-4">
          <AnimatePresence>
            {orders
              .filter(o => {
                if (statusFilter === 'pending') {
                  return o.status === 'pending' || o.status === 'accepted' || o.status === 'processing' || o.status === 'waiting_confirmation' || o.status === 'mark_as_paid';
                }
                if (statusFilter === 'all') return true;
                return o.status === statusFilter;
              })
              .filter(o => {
                const saId = o.assigned_sub_admin_id || o.assignedSubAdminId;
                const isMine = saId === operator?.id;
                const isUnassigned = !saId;
                const isOther = saId && saId !== operator?.id;

                const allowed = operator?.allowedServices || [];
                const isAllowed = !allowed.length || allowed.includes(o.type?.toLowerCase());
                return isAllowed && !isOther;
              })
              .map((order, idx) => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center font-bold text-blue-500 uppercase">
                      {order.userName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{order.userName}</p>
                      <p className="text-[10px] text-slate-500 font-mono tracking-tighter">#{order.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "rounded-lg px-2 py-0.5 text-[10px] uppercase font-bold",
                    (order.status === 'pending' && !order.assigned_sub_admin_id) && "bg-yellow-500/10 text-yellow-500",
                    (order.status === 'pending' && order.assigned_sub_admin_id) && "bg-orange-500/10 text-orange-500",
                    order.status === 'accepted' && "bg-blue-500/10 text-blue-500",
                    order.status === 'processing' && "bg-indigo-500/10 text-indigo-500",
                    (order.status === 'waiting_confirmation' || order.status === 'mark_as_paid') && "bg-purple-500/10 text-purple-500",
                    (order.status === 'completed' || order.status === 'approved') && "bg-green-500/10 text-green-500",
                    order.status === 'disputed' && "bg-red-500/10 text-red-500"
                  )}>
                    {(order.status === 'waiting_confirmation' || order.status === 'mark_as_paid') ? 'WAITING USER' : 
                     (order.status === 'pending' && order.assigned_sub_admin_id) ? 'ASSIGNED' :
                     order.status === 'accepted' ? 'CLAIMED' :
                     order.status?.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Amount</p>
                    <p className="text-xl font-black text-white">{(order.currency === 'VND' || order.type === 'cash_in' || order.type === 'add_money') ? '₫' : order.currency === 'USDT' ? '$' : '৳'}{order.amount}</p>
                    {(order.commission_amount || order.commissionAmount) && (
                      <p className="text-[10px] text-green-500 font-bold mt-1 uppercase tracking-tighter">
                        Earned: ₫{(order.commission_amount || order.commissionAmount).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsProofModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >
                    <FileImage className="w-3 h-3" /> View Proof
                  </button>
                </div>

                  <div className="flex gap-2 border-t border-white/5 pt-4 font-bold">
                    {(order.status === 'pending' || order.status === 'accepted' || order.status === 'processing') ? (
                      <>
                        {order.status === 'pending' && !(order.assigned_sub_admin_id || order.assignedSubAdminId) && (
                          <Button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsAcceptConfirmOpen(true);
                            }}
                            className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs"
                          >
                            Accept
                          </Button>
                        )}
                        {order.status === 'pending' && (order.assigned_sub_admin_id === operator?.id || order.assignedSubAdminId === operator?.id) && (
                          <Button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsAcceptConfirmOpen(true);
                            }}
                            className="flex-1 h-11 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs"
                          >
                            Confirm Claim
                          </Button>
                        )}
                        {order.status === 'accepted' && (
                          <Button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsStartConfirmOpen(true);
                            }}
                            className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs"
                          >
                            Start
                          </Button>
                        )}
                        {order.status === 'processing' && (
                          <Button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsPaidConfirmOpen(true);
                            }}
                            className="flex-1 h-11 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs"
                          >
                            Finalize
                          </Button>
                        )}
                        {(order.status === 'accepted' || order.status === 'processing' || order.status === 'waiting_confirmation' || order.status === 'mark_as_paid') && (
                          <Button 
                            onClick={() => navigate(`/operator/appeal/${order.id}`)}
                            className="h-11 px-4 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 flex gap-2 items-center justify-center"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Chat
                          </Button>
                        )}
                        <Button 
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsRejectModalOpen(true);
                        }}
                        className="flex-1 h-11 bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-xs"
                      >
                        Reject
                      </Button>
                    </>
                  ) : (
                    <div className="w-full h-11 flex items-center justify-center bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Action Taken</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between overflow-x-auto whitespace-nowrap">
           <p className="text-xs text-slate-500 font-bold px-4">Showing current list</p>
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
               <span className="text-2xl font-black text-white">{(selectedOrder?.currency === 'VND' || selectedOrder?.type === 'cash_in' || selectedOrder?.type === 'add_money') ? '₫' : selectedOrder?.currency === 'USDT' ? '$' : '৳'}{selectedOrder?.amount}</span>
             </div>
             <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setIsProofModalOpen(false);
                    if (selectedOrder?.status === 'pending') setIsAcceptConfirmOpen(true);
                    else if (selectedOrder?.status === 'accepted') setIsStartConfirmOpen(true);
                    else if (selectedOrder?.status === 'processing') setIsPaidConfirmOpen(true);
                  }}
                  disabled={selectedOrder?.status !== 'pending' && selectedOrder?.status !== 'accepted' && selectedOrder?.status !== 'processing'}
                  className="h-12 px-8 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold"
                >
                  {selectedOrder?.status === 'pending' ? 'Accept Now' : selectedOrder?.status === 'accepted' ? 'Start Processing' : 'Finalize Task'}
                </Button>
                <Button 
                  onClick={() => {
                    setIsProofModalOpen(false);
                    setIsRejectModalOpen(true);
                  }}
                  disabled={selectedOrder?.status !== 'pending' && selectedOrder?.status !== 'accepted' && selectedOrder?.status !== 'processing'}
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

      {/* Accept Confirmation */}
      <Dialog open={isAcceptConfirmOpen} onOpenChange={setIsAcceptConfirmOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-[2rem]">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <Eye className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-display font-black tracking-tight mb-4">Accept This Order?</h2>
            <p className="text-sm text-slate-400">By accepting, you commit to processing this order. Only you will be able to mark it as processed.</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
             <Button variant="ghost" onClick={() => setIsAcceptConfirmOpen(false)} className="h-12 flex-1 rounded-xl font-bold">Cancel</Button>
             <Button 
               onClick={handleAccept} 
               className="h-12 flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
             >
               Yes, Accept Order
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Confirmation */}
      <Dialog open={isStartConfirmOpen} onOpenChange={setIsStartConfirmOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-[2rem] overflow-hidden">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <Clock className="w-8 h-8 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-display font-black tracking-tight mb-2">Start Processing?</h2>
            <p className="text-xs text-slate-400 px-6 font-medium italic">By starting, you confirm that you have received the payment or are currently verifying it.</p>

            <div className="mt-6 px-6 space-y-4 text-left">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex justify-between items-center group">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount Expected</span>
                  <span className="text-lg font-black text-white">{selectedOrder?.currency === 'VND' ? '₫' : '৳'}{selectedOrder?.amount}</span>
                </div>
                
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Sender's Details</p>
                  <div className="p-3 bg-black/40 rounded-xl space-y-1 font-bold">
                    <p className="text-xs text-white flex justify-between"><span>Method:</span> <span className="text-blue-400 uppercase">{selectedOrder?.paymentMethod || 'BANK'}</span></p>
                    <p className="text-xs text-white flex justify-between"><span>Sender No:</span> <span className="text-blue-400 font-mono">{selectedOrder?.senderNumber || selectedOrder?.sender_number}</span></p>
                    <p className="text-xs text-white flex justify-between"><span>Transaction ID:</span> <span className="text-amber-500 font-mono">{selectedOrder?.transactionId || 'N/A'}</span></p>
                  </div>
                </div>

                {(selectedOrder?.userProof || selectedOrder?.proofUrl || selectedOrder?.docUrl) && (
                  <div className="pt-3">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Payment Receipt</p>
                     <div className="relative group overflow-hidden rounded-xl bg-black border border-white/5 aspect-video flex items-center justify-center">
                        <img 
                          src={selectedOrder?.userProof || selectedOrder?.proofUrl || selectedOrder?.docUrl} 
                          alt="User Receipt" 
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 p-6 bg-indigo-600/5">
             <Button 
               onClick={handleStartProcessing} 
               className="h-12 w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-xl shadow-indigo-600/20"
             >
               Yes, Start Work
             </Button>
             <Button variant="ghost" onClick={() => setIsStartConfirmOpen(false)} className="h-12 w-full rounded-xl font-bold text-slate-500">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Confirmation */}
      <Dialog open={isPaidConfirmOpen} onOpenChange={setIsPaidConfirmOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-[2rem]">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-display font-black tracking-tight mb-4">Confirm Processed?</h2>
            
            <div className="space-y-4 text-left">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">User to Receive:</span>
                   <span className="text-white font-black text-lg">{(selectedOrder?.currency === 'VND' || selectedOrder?.type === 'add_money' || selectedOrder?.type === 'cash_in') ? '₫' : selectedOrder?.currency === 'USDT' ? '$' : '৳'}{selectedOrder?.amount}</span>
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Upload Payment Proof (Admin)</label>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
                    proofFile ? "border-blue-500 bg-blue-500/5" : "border-white/10 hover:border-blue-500/50"
                  )}
                  onClick={() => document.getElementById('admin-proof-add-money')?.click()}
                >
                  <input 
                    id="admin-proof-add-money"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                  {proofFile ? (
                    <div className="flex items-center justify-center gap-2 text-blue-500">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-bold">{proofFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="w-6 h-6 text-slate-600" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Click to upload transfer screenshot</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3 text-left">
               <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0" />
               <p className="text-[10px] text-blue-500 leading-tight font-bold uppercase italic">
                 Warning: This will immediately increase the user's balance and complete the order. Your wallet balance will be deducted.
               </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
             <Button variant="ghost" onClick={() => setIsPaidConfirmOpen(false)} className="h-12 flex-1 rounded-xl font-bold">Cancel</Button>
             <Button 
               onClick={handleMarkAsPaid} 
               disabled={isSubmitting}
               className="h-12 flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-xl shadow-green-600/20"
             >
               {isSubmitting ? 'Processing...' : 'Yes, Complete Order'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
