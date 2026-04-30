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
  FileImage,
  CreditCard,
  ArrowRightLeft,
  Smartphone,
  Check
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

export default function OperatorExchange({ mode = 'exchange' }: { mode?: 'exchange' | 'withdraw' | 'recharge' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [isPaidConfirmOpen, setIsPaidConfirmOpen] = useState(false);
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
    if (statusFilter !== 'all') {
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
        sub_admin_actioned_at: new Date().toISOString()
      });
      
      toast.success('Order accepted. Please process the payment.', { id: 'accept' });
      setIsAcceptConfirmOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to accept', { id: 'accept' });
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedOrder || !operator) return;
    toast.loading('Marking as paid...', { id: 'paid' });
    
    try {
      await supabaseService.updateDocument('transactions', selectedOrder.id, {
        status: 'mark_as_paid',
        sub_admin_action: 'mark_as_paid',
        sub_admin_actioned_at: new Date().toISOString()
      });

      // For Exchange/Withdraw, the balance is added back to operator wallet?
      // Actually, usually in these flows the sub-admin pays the user.
      // So they get a "commission" or the admin refills them.
      // For now, let's just log it.
      
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
    }
  };

  const handleReject = async () => {
    if (!rejectionReason || !operator) {
      toast.error('Reason required');
      return;
    }
    toast.loading('Rejecting...', { id: 'reject' });
    
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
      fetchData();
    } catch (error) {
      toast.error('Failed to reject', { id: 'reject' });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-display font-black tracking-tight text-white capitalize">{mode} Requests</h1>
        <p className="text-slate-500 mt-1 font-medium text-sm">Process transfers and verify user documents.</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search Order ID or user..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 bg-white/5 border-white/10 pl-12 rounded-2xl"
          />
        </div>
        <div className="relative">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-12 bg-white/5 border-white/10 px-6 rounded-2xl text-sm font-medium appearance-none focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="mark_as_paid">Mark as Paid</option>
            <option value="completed">Completed</option>
            <option value="all">All Status</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#161b22] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order ID</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User & Source</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bank/Dest Details</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders
                .filter(o => (o.assignedSubAdminId === operator?.id || !o.assignedSubAdminId))
                .filter(o => o.type.toLowerCase() === mode && (statusFilter === 'all' || o.status === statusFilter))
                .map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5">
                    <span className="text-blue-400 font-bold font-mono tracking-tight">#{order.id}</span>
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
                      {order.bankDetails ? (
                        <>
                          <p className="font-bold text-slate-200">{order.bankDetails.bankName}</p>
                          <p className="text-slate-500">{order.bankDetails.accountNumber}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-slate-200">{order.rechargeDetails?.operator}</p>
                          <p className="text-slate-500">{order.rechargeDetails?.number}</p>
                        </>
                      )}
                      <button 
                        onClick={() => { setSelectedOrder(order); setIsDocModalOpen(true); }}
                        className="text-blue-500 hover:underline text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mt-2"
                      >
                         <FileImage className="w-3 h-3" /> View Doc
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-black text-white text-lg">৳{order.amount}</span>
                      {order.rate && <span className="text-[9px] font-bold text-slate-600">{order.rate}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                     <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block",
                        order.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                        order.status === 'accepted' ? "bg-blue-500/10 text-blue-500" :
                        order.status === 'mark_as_paid' ? "bg-cyan-500/10 text-cyan-500" :
                        order.status === 'completed' ? "bg-purple-500/10 text-purple-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {order.status?.replace(/_/g, ' ') || 'N/A'}
                      </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                       {order.status === 'pending' && (
                         <>
                           <Button onClick={() => { setSelectedOrder(order); setIsAcceptConfirmOpen(true); }} className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold">Accept</Button>
                           <Button onClick={() => { setSelectedOrder(order); setIsRejectModalOpen(true); }} variant="dark" className="h-9 px-4 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-xl text-xs font-bold ring-1 ring-red-500/20 shadow-lg shadow-red-600/5">Reject</Button>
                         </>
                       )}
                       {order.status === 'accepted' && (
                         <Button onClick={() => { setSelectedOrder(order); setIsPaidConfirmOpen(true); }} className="h-9 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-xl shadow-blue-600/20">Mark as Paid</Button>
                       )}
                       {order.status === 'mark_as_paid' && (
                         <span className="text-[10px] font-bold text-slate-500 italic uppercase">Awaiting Completion</span>
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
      </div>

       {/* Doc Viewer */}
      <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-white p-0 rounded-[2.5rem] overflow-hidden">
           <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold font-display tracking-tight">Bank/Personal Document</h2>
              <Button variant="ghost" onClick={() => setIsDocModalOpen(false)}>Close</Button>
           </div>
           <div className="p-4 bg-black/50 aspect-[4/3] flex items-center justify-center">
              <img src={selectedOrder?.docUrl} alt="Document" className="max-h-full rounded-xl object-contain shadow-2xl" />
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

      {/* Paid Confirm */}
      <Dialog open={isPaidConfirmOpen} onOpenChange={setIsPaidConfirmOpen}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-800 text-white rounded-[2rem]">
           <div className="text-center py-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
                 <CreditCard className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-display font-black tracking-tight tracking-tighter">Mark as Paid?</h2>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4 text-left mt-6">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Payment Sent:</span>
                   <span className="text-white font-black text-lg">৳{selectedOrder?.amount}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm border-t border-white/5 pt-4">
                   <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Wallet Load:</span>
                   <span className="text-blue-400 font-black text-lg">+৳{selectedOrder?.amount}</span>
                 </div>
              </div>
              
              <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3 text-left">
                 <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0" />
                 <p className="text-[10px] text-blue-500 leading-tight font-bold uppercase italic">
                   Only confirm if you've already sent the funds to the user's provided bank/wallet account.
                 </p>
              </div>
           </div>
           <DialogFooter className="flex flex-col gap-2">
              <Button onClick={handleMarkAsPaid} className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/30 text-lg">Confirm Sent Payment</Button>
              <Button variant="ghost" onClick={() => setIsPaidConfirmOpen(false)} className="w-full h-12 rounded-xl text-slate-500">Cancel</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
