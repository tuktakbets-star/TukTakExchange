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
  CreditCard,
  ArrowRightLeft,
  Smartphone,
  Check,
  Upload,
  MessageSquare,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function OperatorExchange({ mode = 'exchange' }: { mode?: 'exchange' | 'withdraw' | 'recharge' }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
  const [isPaidConfirmOpen, setIsPaidConfirmOpen] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [mode, statusFilter]);

  const fetchData = async () => {
    const sessionStr = sessionStorage.getItem('operator_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);

    const { data: opData } = await supabaseService.getDocument('sub_admins', session.id);
    if (opData) setOperator(opData);

    const constraints = [
      where('type', '==', mode),
      orderBy('created_at', 'desc')
    ];
    if (statusFilter === 'pending') {
      // Fetch pending, accepted, processing, and waiting confirmation
      constraints.push(where('status', 'in', ['pending', 'accepted', 'processing', 'waiting_confirmation', 'mark_as_paid']));
    } else if (statusFilter !== 'all') {
      constraints.push(where('status', '==', statusFilter));
    }

    const data = await supabaseService.getCollection('transactions', constraints);
    setOrders(data || []);
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!selectedOrder || !operator) return;
    toast.loading('Accepting order...', { id: 'accept' });
    
    try {
      await supabaseService.updateDocument('transactions', selectedOrder.id, {
        status: 'accepted',
        assigned_sub_admin_id: operator.id,
        sub_admin_action: 'accepted',
        sub_admin_actioned_at: new Date().toISOString(),
        claim_time: new Date().toISOString()
      });
      
      toast.success('Order claimed. Find it in Ongoing list to Start Processing.', { id: 'accept' });
      setIsAcceptConfirmOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to accept', { id: 'accept' });
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedOrder || !operator) return;
    toast.loading('Starting task...', { id: 'start' });
    
    try {
      await supabaseService.updateDocument('transactions', selectedOrder.id, {
        status: 'processing',
        updated_at: new Date().toISOString()
      });
      
      toast.success('Task started. Complete payment and upload proof.', { id: 'start' });
      setIsStartConfirmOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to start', { id: 'start' });
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedOrder || !operator || !proofFile) {
      toast.error('Please upload a payment proof screenshot');
      return;
    }
    setIsSubmitting(true);
    toast.loading('Uploading proof and marking as paid...', { id: 'paid' });
    
    try {
      // Check if operator has enough balance
      const amount = Number(selectedOrder.amount || 0);
      const targetAmount = Number(selectedOrder.target_amount || selectedOrder.targetAmount || 0);
      
      // Determine impact amount (using same logic as WaitingPage for consistency)
      let impactAmount = amount;
      if (selectedOrder.currency === 'VND') impactAmount = amount;
      else if (selectedOrder.target_currency === 'VND') impactAmount = targetAmount;
      
      if (Number(operator?.wallet_balance || 0) < impactAmount) {
        toast.error('Insufficient working balance! Please refill your wallet.', { id: 'paid' });
        setIsSubmitting(false);
        return;
      }

      const proofUrl = await supabaseService.uploadFile(proofFile);
      
      await supabaseService.updateDocument('transactions', selectedOrder.id, {
        status: 'waiting_confirmation',
        admin_proof: proofUrl,
        sub_admin_action: 'mark_as_paid',
        sub_admin_actioned_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        paidAt: new Date().toISOString()
      });

      await supabaseService.addDocument('sub_admin_logs', {
        sub_admin_id: operator.id,
        action_type: mode,
        order_id: selectedOrder.id,
        user_id: selectedOrder.uid,
        amount: selectedOrder.amount,
        status: 'mark_as_paid',
        timestamp: new Date().toISOString()
      });

      toast.success('Funds marked as paid. Waiting for finality.', { id: 'paid' });
      setIsPaidConfirmOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to mark as paid', { id: 'paid' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason || !operator || !selectedOrder) {
      toast.error('Reason required');
      return;
    }
    toast.loading('Rejecting...', { id: 'reject' });
    
    try {
      // 1. Release Locked Balance
      const tx = selectedOrder;
      const amount = tx.amount || 0;
      const totalToDeduct = tx.total_to_deduct || tx.totalToDeduct || amount;
      const needsRefund = tx.type === 'withdraw' || tx.type === 'exchange' || tx.type === 'recharge' || tx.type === 'cash_out';

      if (needsRefund) {
        // Release locked balance back to available
        await supabaseService.updateWalletBalance(tx.uid, tx.currency, 0, -totalToDeduct);
      }

      await supabaseService.updateDocument('transactions', selectedOrder.id, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        assigned_sub_admin_id: operator.id,
        sub_admin_action: 'rejected',
        sub_admin_actioned_at: new Date().toISOString()
      });
      
      toast.success('Order rejected', { id: 'reject' });
      setIsRejectModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to reject', { id: 'reject' });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white capitalize">{mode} Requests</h1>
        <p className="text-slate-500 mt-1 font-medium text-[10px] sm:text-sm uppercase tracking-widest">Verify and process transfers</p>
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

      <div className="bg-[#161b22] border border-white/5 rounded-[2.5rem] overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto min-h-[400px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Order ID</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">User & Source</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Bank/Dest Details</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Amount</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
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

                  const allowed = operator?.allowed_services || [];
                  const isAllowed = !allowed.length || allowed.includes(o.type?.toLowerCase());
                  return isAllowed && !isOther;
                })
                .map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5">
                    <span className="text-blue-400 font-bold font-mono tracking-tight text-xs">#{order.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm tracking-tight text-white">{order.userName}</span>
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                         {new Date(order.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-xs space-y-1">
                      {order.receiverInfo ? (
                        <>
                          <p className="font-bold text-slate-200">{order.receiverInfo.name}</p>
                          <p className="text-slate-400">Bank: {order.receiverInfo.bankName || order.accountType}</p>
                          <p className="text-white font-mono">{order.receiverInfo.accountNumber}</p>
                          {order.receiverInfo.branch && <p className="text-slate-500 italic">Branch: {order.receiverInfo.branch}</p>}
                          {order.receiverInfo.qrCode && (
                            <button 
                              onClick={() => { setSelectedOrder({ ...order, proofUrl: order.receiverInfo.qrCode }); setIsDocModalOpen(true); }}
                              className="text-blue-500 text-[10px] font-bold mt-1"
                            >
                              View Receiver QR
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-500 italic">No details found</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-black text-white text-lg">
                        {order.currency === 'VND' ? '₫' : '৳'}{order.amount}
                      </span>
                      {mode === 'exchange' && (
                        <span className="text-xs font-bold text-blue-400">
                           → {order.targetAmount || order.target_amount} {order.targetCurrency || order.target_currency}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <Badge className={cn(
                      "rounded-lg px-2 py-0.5 text-[10px] uppercase font-bold",
                      (order.status === 'pending' && !order.assigned_sub_admin_id) && "bg-yellow-500/10 text-yellow-500",
                      (order.status === 'pending' && order.assigned_sub_admin_id) && "bg-orange-500/10 text-orange-500",
                      order.status === 'accepted' && "bg-blue-500/10 text-blue-500",
                      order.status === 'processing' && "bg-indigo-500/10 text-indigo-500",
                      (order.status === 'waiting_confirmation' || order.status === 'mark_as_paid') && "bg-purple-500/10 text-purple-500",
                      order.status === 'completed' && "bg-green-500/10 text-green-500",
                      order.status === 'disputed' && "bg-red-500/10 text-red-500"
                    )}>
                      {(order.status === 'waiting_confirmation' || order.status === 'mark_as_paid') ? 'WAITING USER' : 
                       (order.status === 'pending' && order.assigned_sub_admin_id) ? 'ASSIGNED' :
                       order.status === 'accepted' ? 'CLAIMED' :
                       order.status?.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                       {order.status === 'pending' && !(order.assigned_sub_admin_id || order.assignedSubAdminId) && (
                         <>
                           <Button onClick={() => { setSelectedOrder(order); setIsAcceptConfirmOpen(true); }} className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold">Accept</Button>
                           <Button onClick={() => { setSelectedOrder(order); setIsRejectModalOpen(true); }} variant="dark" className="h-9 px-4 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-xl text-xs font-bold ring-1 ring-red-500/20 shadow-lg shadow-red-600/5">Reject</Button>
                         </>
                       )}
                       {order.status === 'pending' && (order.assigned_sub_admin_id === operator?.id || order.assignedSubAdminId === operator?.id) && (
                         <>
                           <Button onClick={() => { setSelectedOrder(order); setIsAcceptConfirmOpen(true); }} className="h-9 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold">Confirm Claim</Button>
                           <Button onClick={() => { setSelectedOrder(order); setIsRejectModalOpen(true); }} variant="dark" className="h-9 px-4 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-xl text-xs font-bold ring-1 ring-red-500/20 shadow-lg shadow-red-600/5">Reject</Button>
                         </>
                       )}
                       {order.status === 'accepted' && (
                          <Button onClick={() => { setSelectedOrder(order); setIsStartConfirmOpen(true); }} className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xl shadow-indigo-600/20">Start Processing</Button>
                       )}
                       {order.status === 'processing' && (
                         <Button onClick={() => { setSelectedOrder(order); setIsPaidConfirmOpen(true); }} className="h-9 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-xl shadow-blue-600/20">Mark as Paid</Button>
                       )}
                       {(order.status === 'accepted' || order.status === 'processing' || order.status === 'mark_as_paid' || order.status === 'waiting_confirmation') && (
                          <Button 
                            onClick={() => navigate(`/operator/appeal/${order.id}`)}
                            variant="ghost"
                            className="h-9 w-9 p-0 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white rounded-xl transition-all ml-1"
                            title="Message Client"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                       )}
                       {(order.status === 'mark_as_paid' || order.status === 'waiting_confirmation') && (
                         <span className="text-[10px] font-bold text-slate-500 italic uppercase">Awaiting Confirm</span>
                       )}
                       {order.status === 'completed' && (
                         <CheckCircle2 className="w-5 h-5 text-purple-500" />
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-4 p-4">
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

              const allowed = operator?.allowed_services || [];
              const isAllowed = !allowed.length || allowed.includes(o.type?.toLowerCase());
              return isAllowed && !isOther;
            })
            .map((order) => (
            <Card key={order.id} className="bg-white/5 border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <CardContent className="p-5 space-y-4">
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
                    order.status === 'completed' && "bg-green-500/10 text-green-500",
                    order.status === 'disputed' && "bg-red-500/10 text-red-500"
                  )}>
                    {(order.status === 'waiting_confirmation' || order.status === 'mark_as_paid') ? 'WAITING USER' : 
                     (order.status === 'pending' && order.assigned_sub_admin_id) ? 'ASSIGNED' :
                     order.status === 'accepted' ? 'CLAIMED' :
                     order.status?.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Amount</p>
                      <p className="font-black text-white text-base">₫{order.amount?.toLocaleString()}</p>
                      {mode === 'exchange' && (
                        <p className="text-[10px] text-blue-400 font-bold mt-1">
                          → {order.targetAmount || order.target_amount || (order.amount * 1000)} {order.targetCurrency || order.target_currency}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Transaction ID</p>
                      <p className="text-[10px] font-mono text-slate-400">{order.transactionId || order.txId || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="overflow-hidden space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Receiver</p>
                      <p className="text-xs font-bold text-slate-200 truncate">{order.receiverInfo?.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{order.receiverInfo?.bankName}</p>
                      <p className="text-[10px] font-mono text-blue-400 mt-1">{order.receiverInfo?.accountNumber || order.receiverInfo?.account}</p>
                    </div>
                    {(order.userProof || order.proofUrl || order.docUrl || (order.receiverInfo?.qrCode) || order.receiver_info?.qrCode) && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation();
                          setSelectedOrder({ ...order, proofUrl: order.userProof || order.proofUrl || order.docUrl || (order.receiverInfo?.qrCode) || order.receiver_info?.qrCode }); 
                          setIsDocModalOpen(true); 
                        }}
                        className="flex items-center gap-2 text-blue-500 text-[10px] font-bold mt-1 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 active:scale-95 transition-all"
                      >
                         <Eye className="w-3 h-3" />
                         VIEW USER PROOF/QR
                      </button>
                    )}
                    {order.senderInfo && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Sender Info</p>
                        <p className="text-[10px] text-slate-400 truncate">{order.senderInfo.name} ({order.senderInfo.method})</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-white/5">
                  {(order.status === 'pending' || order.status === 'accepted' || order.status === 'processing') && (
                    <>
                      {order.status === 'pending' && !(order.assigned_sub_admin_id || order.assignedSubAdminId) && (
                        <>
                          <Button onClick={() => { setSelectedOrder(order); setIsAcceptConfirmOpen(true); }} className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold">Accept</Button>
                          <Button onClick={() => { setSelectedOrder(order); setIsRejectModalOpen(true); }} className="flex-1 h-11 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-xl text-xs font-bold ring-1 ring-red-500/20">Reject</Button>
                        </>
                      )}
                      {order.status === 'pending' && (order.assigned_sub_admin_id === operator?.id || order.assignedSubAdminId === operator?.id) && (
                        <>
                          <Button onClick={() => { setSelectedOrder(order); setIsAcceptConfirmOpen(true); }} className="flex-1 h-11 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold">Confirm Claim</Button>
                          <Button onClick={() => { setSelectedOrder(order); setIsRejectModalOpen(true); }} className="flex-1 h-11 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-xl text-xs font-bold ring-1 ring-red-500/20">Reject</Button>
                        </>
                      )}
                      {order.status === 'accepted' && (
                        <Button onClick={() => { setSelectedOrder(order); setIsStartConfirmOpen(true); }} className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xl shadow-indigo-600/20 font-black tracking-widest uppercase">Start Processing</Button>
                      )}
                      {order.status === 'processing' && (
                        <Button onClick={() => { setSelectedOrder(order); setIsPaidConfirmOpen(true); }} className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-xl shadow-blue-600/20 font-black tracking-widest uppercase">Mark as Paid</Button>
                      )}
                    </>
                  )}
                  {(order.status === 'accepted' || order.status === 'processing' || order.status === 'mark_as_paid' || order.status === 'waiting_confirmation') && (
                    <Button 
                      onClick={() => navigate(`/operator/appeal/${order.id}`)}
                      className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xl shadow-blue-600/20 flex gap-2 items-center justify-center"
                    >
                      <MessageSquare className="w-4 h-4" />
                      MESSAGE CLIENT
                    </Button>
                  )}
                  {(order.status === 'mark_as_paid' || order.status === 'waiting_confirmation') && (
                    <div className="w-full h-11 flex items-center justify-center bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[10px] font-bold text-slate-500 italic uppercase tracking-widest">Awaiting Confirmation</span>
                    </div>
                  )}
                  {order.status === 'completed' && (
                    <div className="w-full h-11 flex items-center justify-center gap-2 text-green-500">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Completed</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

       {/* Doc Viewer */}
      <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-white p-0 rounded-[2.5rem] overflow-hidden">
           <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold font-display tracking-tight">Bank/Personal Document</h2>
              <Button variant="ghost" onClick={() => setIsDocModalOpen(false)}>Close</Button>
           </div>
           <div className="p-4 bg-black/50 aspect-[4/3] flex items-center justify-center">
              <img 
                src={selectedOrder?.proofUrl || selectedOrder?.docUrl || (selectedOrder?.receiverInfo?.qrCode) || selectedOrder?.receiver_info?.qrCode} 
                alt="Document" 
                className="max-h-full rounded-xl object-contain shadow-2xl" 
                referrerPolicy="no-referrer"
              />
           </div>
        </DialogContent>
      </Dialog>

      {/* Accept Confirm */}
      <Dialog open={isAcceptConfirmOpen} onOpenChange={setIsAcceptConfirmOpen}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-800 text-white rounded-[2rem]">
           <div className="text-center py-6">
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                 <Check className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-display font-black tracking-tight">Accept Request?</h2>
              <p className="text-slate-500 text-sm mt-2 px-4 italic leading-relaxed font-medium capitalize">You are about to start processing this {mode} request. Ensure the user's details look valid.</p>
           </div>
           <DialogFooter className="flex flex-col gap-2">
              <Button onClick={handleAccept} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xl shadow-blue-600/20">Yes, Accept Order</Button>
              <Button variant="ghost" onClick={() => setIsAcceptConfirmOpen(false)} className="w-full h-12 rounded-xl text-slate-500">Cancel</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Confirm */}
      <Dialog open={isStartConfirmOpen} onOpenChange={setIsStartConfirmOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-[2rem] overflow-hidden">
           <div className="text-center py-6">
              <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                 <Clock className="w-8 h-8 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-display font-black tracking-tight">Start Transaction?</h2>
              <p className="text-slate-500 text-xs mt-2 px-6 italic leading-relaxed font-medium">You are moving this to processing state. This confirms you are currently sending the funds to the user.</p>

              <div className="mt-6 px-6 space-y-4 text-left">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center group">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount to Pay</span>
                    <span className="text-lg font-black text-white">{selectedOrder?.currency === 'VND' ? '₫' : '৳'}{selectedOrder?.amount}</span>
                  </div>
                  {selectedOrder?.receiverInfo && (
                    <div className="pt-3 border-t border-white/5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Receiver Details</p>
                      <div className="p-3 bg-black/40 rounded-xl space-y-1">
                        <p className="text-xs font-bold text-white flex justify-between"><span>Method:</span> <span className="text-blue-400 capitalize">{selectedOrder.receiverInfo.method}</span></p>
                        <p className="text-xs font-bold text-white flex justify-between"><span>Number:</span> <span className="text-blue-400 font-mono">{selectedOrder.receiverInfo.number || selectedOrder.receiverInfo.accountNumber}</span></p>
                        <p className="text-xs font-bold text-white flex justify-between"><span>Name:</span> <span className="text-blue-400">{selectedOrder.receiverInfo.name}</span></p>
                      </div>
                    </div>
                  )}
                  {(selectedOrder?.userProof || selectedOrder?.proofUrl || selectedOrder?.docUrl || (selectedOrder?.receiverInfo?.qrCode) || selectedOrder?.receiver_info?.qrCode) && (
                    <div className="pt-3">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Reference Image / QR</p>
                       <div className="relative group overflow-hidden rounded-xl bg-black border border-white/5">
                          <img 
                            src={selectedOrder?.userProof || selectedOrder?.proofUrl || selectedOrder?.docUrl || (selectedOrder?.receiverInfo?.qrCode) || selectedOrder?.receiver_info?.qrCode} 
                            alt="Proof/QR" 
                            className="w-full h-32 object-contain group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                             <Button size="xs" variant="ghost" className="text-[10px] font-black text-white uppercase" onClick={() => { setIsStartConfirmOpen(false); setIsDocModalOpen(true); }}>Click to Zoom</Button>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              </div>
           </div>
           <DialogFooter className="flex flex-col gap-2 p-6 bg-indigo-600/5">
              <Button onClick={handleStartProcessing} className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-xl shadow-indigo-600/20">Yes, Start Now</Button>
              <Button variant="ghost" onClick={() => setIsStartConfirmOpen(false)} className="w-full h-12 rounded-xl text-slate-500">Cancel</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaidConfirmOpen} onOpenChange={setIsPaidConfirmOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-[2.5rem] p-8">
           <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
                 <CreditCard className="w-8 h-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-display font-black tracking-tight tracking-tighter">Confirm Payment Sent</DialogTitle>
              
              <div className="space-y-4 mt-6">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <Label className="text-xs text-slate-400 text-left block">Upload Payment Receipt (Required)</Label>
                    <div 
                      className={cn(
                        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                        proofFile ? "border-blue-500 bg-blue-500/5" : "border-white/10 hover:border-blue-500/50"
                      )}
                      onClick={() => document.getElementById('admin-proof-upload')?.click()}
                    >
                      <input 
                        id="admin-proof-upload"
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                      {proofFile ? (
                        <div className="text-blue-400">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-xs font-bold">{proofFile.name}</p>
                        </div>
                      ) : (
                        <div className="text-slate-500">
                          <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-bold">Click to upload transfer screenshot</p>
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Paying User:</span>
                      <span className="text-white font-black">{selectedOrder?.currency === 'VND' ? '₫' : '৳'}{selectedOrder?.amount}</span>
                    </div>
                 </div>
              </div>
              
              <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3 text-left">
                 <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0" />
                 <p className="text-[10px] text-blue-500 leading-tight font-bold uppercase italic">
                   The order status will change to "Waiting for Confirmation". User must click "Received" to complete the pool.
                 </p>
              </div>
           </div>
           <DialogFooter className="flex flex-col gap-2 mt-8">
              <Button 
                onClick={handleMarkAsPaid} 
                disabled={isSubmitting || !proofFile}
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/30 text-lg"
              >
                {isSubmitting ? 'Uploading...' : 'Confirm & Notify User'}
              </Button>
              <Button variant="ghost" onClick={() => setIsPaidConfirmOpen(false)} className="w-full h-12 rounded-xl text-slate-500">Cancel</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
