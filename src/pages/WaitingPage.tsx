import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { supabaseService } from '../lib/supabaseService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  MessageSquare,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Trophy,
  AlertTriangle,
  Loader2,
  Smartphone,
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ImageViewer } from '@/components/ImageViewer';
import { DisputeChat } from '@/components/DisputeChat';

export default function WaitingPage() {
  const { t } = useTranslation();
  const { txId } = useParams();
  const navigate = useNavigate();
  const [tx, setTx] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [loading, setLoading] = useState(true);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [autoCompleteTime, setAutoCompleteTime] = useState(600); // 10 minutes in seconds
  const [isConfirming, setIsConfirming] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { profile } = useAuth();

  const status = tx?.status?.toLowerCase().trim();
  const isAssigned = !!(tx?.assigned_sub_admin_id || tx?.assignedSubAdminId);
  const isPurePending = status === 'pending' && !isAssigned;
  const isClaimedPending = status === 'pending' && isAssigned;
  const isAccepted = status === 'accepted';
  const isProcessing = status === 'processing';
  const isAnyProcessing = isAccepted || isProcessing;
  const isPaid = status === 'paid' || status === 'waiting_confirmation' || status === 'mark_as_paid';
  const isCompleted = status === 'completed' || status === 'approved';
  const isDisputed = status === 'disputed';
  const isCancelled = status === 'cancelled' || status === 'rejected' || status === 'failed';
  const isExchangeFlow = tx?.type === 'exchange' || tx?.type === 'withdraw' || tx?.type === 'recharge';

  const handleAppealClick = async () => {
    if (!txId) return;
    try {
      // Immediately set status to disputed to stop all timers
      await supabaseService.updateDocument('transactions', txId, {
        status: 'disputed',
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      navigate(`/appeal/${txId}`);
    } catch (error) {
      navigate(`/appeal/${txId}`);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!txId || !tx) return;

    setIsConfirming(true);
    try {
      const status = tx.status?.toLowerCase().trim();
      // Avoid double confirmation
      if (status === 'completed') {
        setShowPasswordDialog(false);
        navigate('/wallet');
        return;
      }

      const isAddMoney = tx.type === 'add_money' || tx.type === 'cash_in';
      const amount = tx.amount || 0;
      const totalToDeduct = tx.total_to_deduct || tx.totalToDeduct || amount;

      if (isAddMoney) {
        // ADD MONEY: User gets balance, Sub-Admin loses balance
        // 1. Update user balance (Increase)
        await supabaseService.updateWalletBalance(tx.uid, tx.currency, amount, 0);
      } else {
        // WITHDRAW/EXCHANGE/RECHARGE: User lost balance (was locked), Sub-Admin gains balance
        // 1. Finalize Balance Deduction (Unlock and finalize)
        await supabaseService.updateWalletBalance(tx.uid, tx.currency, -totalToDeduct, -totalToDeduct);
      }

      // 2. Update Sub-Admin Wallet Balance (If not already updated by operator panel)
      const saId = tx.assigned_sub_admin_id || tx.assignedSubAdminId;
      if (saId && tx.sub_admin_action !== 'finalize_completed') {
        const { data: subAdmin } = await supabaseService.getDocument('sub_admins', saId);
        if (subAdmin) {
          const currentBal = Number(subAdmin.walletBalance || 0);
          
          // Logic: Add Money/Cash In = Debit (Decrease), Exchange/Withdraw/Recharge = Credit (Increase)
          const isAddMoney = tx.type === 'add_money' || tx.type === 'cash_in';
          const isDebit = isAddMoney; 
          
          // Detect VND amount specifically
          const bdtAmount = tx.amount || 0;
          const targetAmount = tx.target_amount || tx.targetAmount || 0;
          
          // If transaction is VND based on either side, use that. 
          // If it's a VND withdrawal/exchange, the VND amount is usually what the agent "hands over" (or settles).
          let impactAmount = 0;
          if (tx.currency === 'VND') impactAmount = bdtAmount;
          else if (tx.target_currency === 'VND') impactAmount = targetAmount;
          else impactAmount = bdtAmount; // Fallback

          const delta = isDebit ? -impactAmount : impactAmount;
          const newSaBalance = currentBal + delta;
          
          await supabaseService.updateDocument('sub_admins', saId, {
            wallet_balance: newSaBalance,
            last_order_id: txId,
            updated_at: new Date().toISOString()
          });
          
          // Log Order Deduction/Addition
          await supabaseService.addDocument('sub_admin_wallet_transactions', {
            sub_admin_id: saId,
            type: isDebit ? 'debit' : 'credit',
            amount: Math.abs(delta),
            reason: `Order #${txId} completed (Balance Update)`,
            order_id: txId,
            balance_after: newSaBalance,
            created_at: new Date().toISOString()
          });

          // Process Service-Specific Commission
          await supabaseService.processSubAdminCommission(tx, newSaBalance);
        }
      }

      // Finalize transaction status
      await supabaseService.updateDocument('transactions', txId, { 
        status: 'completed',
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setShowPasswordDialog(false);
      toast.success('Transaction completed successfully!');
      
      // Delay navigation slightly to show success state
      setTimeout(() => {
        navigate('/wallet');
      }, 1500);
    } catch (error) {
      toast.error('Failed to complete transaction');
      setIsConfirming(false);
    }
  };

  useEffect(() => {
    if (!txId) return;

    // Standard fetch + setup re-fetch interval as fallback for realtime
    const fetchData = async () => {
      const { data } = await supabaseService.getDocument('transactions', txId);
      if (data) {
        setTx(data);
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 15000); // Pulse every 15s

    const unsub = supabaseService.subscribeToDocument('transactions', txId, (data) => {
      if (data) {
        setTx(data);
      }
      setLoading(false);
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [txId]);

  useEffect(() => {
    if (!tx) return;

    const getSafeTime = (val: any) => {
      if (!val) return null;
      let d: Date;
      if (typeof val === 'string') {
        d = new Date(val);
      } else if (typeof val === 'object' && val !== null) {
        if (val.toDate && typeof val.toDate === 'function') d = val.toDate();
        else if (val.seconds) d = new Date(val.seconds * 1000);
        else d = new Date(val as any);
      } else if (typeof val === 'number') {
        d = new Date(val);
      } else {
        d = new Date(val);
      }
      return isNaN(d.getTime()) ? null : d.getTime();
    };

    const now = new Date().getTime();
    
    // If transaction is already old, calculate remaining time
    const createdAt = getSafeTime(tx.created_at || tx.createdAt);
    if (createdAt) {
      const elapsed = Math.floor((now - createdAt) / 1000);
      const remaining = Math.max(0, 1800 - elapsed);
      if (!isNaN(remaining)) setTimeLeft(remaining);

      {/* Also set auto-complete timer if paid/waiting confirmation */}
      const s = tx.status?.toLowerCase().trim();
      if (s === 'paid' || s === 'waiting_confirmation' || s === 'mark_as_paid') {
        const paidAtStr = tx.paid_at || tx.paidAt;
        if (paidAtStr) {
          const paidAt = getSafeTime(paidAtStr);
          if (paidAt) {
            const paidElapsed = Math.floor((now - paidAt) / 1000);
            const paidRemaining = Math.max(0, 600 - paidElapsed); // 10 mins
            if (!isNaN(paidRemaining)) setAutoCompleteTime(paidRemaining);
          } else {
            setAutoCompleteTime(600);
          }
        } else {
          setAutoCompleteTime(600);
        }
      }
    } else {
      // Fallback if no creation time yet
      setTimeLeft(1800);
    }
  }, [tx]);

  useEffect(() => {
    // Auto-redirect to wallet after 5 seconds if transaction is in a terminal state
    const s = tx?.status?.toLowerCase().trim();
    // 'completed' and 'approved' are terminal states that trigger auto-redirect to wallet
    const terminalStates = ['completed', 'approved', 'cancelled', 'rejected', 'expired', 'failed'];
    
    // Safety check: if it's still waiting for user confirmation, DO NOT redirect
    if (isPaid) return;
    
    if (s && terminalStates.includes(s)) {
      const timer = setTimeout(() => {
        navigate('/wallet');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tx?.status, navigate]);

  useEffect(() => {
    if (timeLeft <= 0 && tx?.status?.toLowerCase().trim() === 'pending' && !isDisputed) {
      handleCancel();
      return;
    }
    if (timeLeft <= 0 || tx?.status?.toLowerCase().trim() !== 'pending' || isDisputed) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, tx?.status, txId, isDisputed]);

  useEffect(() => {
    const s = tx?.status?.toLowerCase().trim();
    if ((s !== 'paid' && s !== 'waiting_confirmation' && s !== 'mark_as_paid') || isDisputed) return;

    const timer = setInterval(() => {
      setAutoCompleteTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-confirm receipt
          handleConfirmReceipt();
          return 0;
        }
        // User alert sound/effect at 2 minutes (120s)
        if (prev === 121) {
           toast.error(t('danger_alert_complete', 'DANGER: Order will auto-complete in 2 minutes!'), {
             duration: 10000,
             position: 'top-center'
           });
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tx?.status, txId, isDisputed]);
 // Added txId to dependency to ensure it works properly if tx changes

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleCancel = async () => {
    if (!txId || !tx) return;
    try {
      if (tx.status !== 'pending' && tx.status !== 'disputed') {
        toast.error('Cannot cancel an accepted order');
        return;
      }

      // 1. Refund Locked Balance if it was deducted at creation
      const needsRefund = tx.type === 'withdraw' || tx.type === 'exchange' || tx.type === 'recharge' || tx.type === 'cash_out';
      
      if (needsRefund) {
        const amount = tx.amount || 0;
        const totalToDeduct = tx.total_to_deduct || tx.totalToDeduct || amount;
        await supabaseService.updateWalletBalance(tx.uid, tx.currency, 0, -totalToDeduct);
      }

      // Update status to cancelled instead of deleting (so it shows in history)
      await supabaseService.updateDocument('transactions', txId, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });

      toast.success('Transaction cancelled and refunded');
      navigate('/wallet');
    } catch (error) {
      toast.error('Failed to cancel transaction');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;
  if (!tx) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Transaction not found</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8 pt-12">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/wallet')} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToHome')}
          </Button>
          <Badge variant="outline" className="border-white/10 text-slate-400">
            TX ID: {txId?.substring(0, 8)}
          </Badge>
        </div>

        <div className="text-center space-y-6">
          <div className="relative inline-block">
            <div className={cn(
              "w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-2 relative z-10",
              (isPurePending || isClaimedPending || isAnyProcessing || isPaid) ? "bg-blue-500/10 text-blue-500" :
              isCompleted ? "bg-green-500/20 text-green-500" :
              (isDisputed || isCancelled) ? "bg-red-500/20 text-red-500" :
              "bg-red-500/10 text-red-500"
            )}>
              {(isPurePending || isClaimedPending || isAnyProcessing || isPaid) ? <Clock className="w-14 h-14 animate-pulse" /> :
               isCompleted ? <Trophy className="w-14 h-14" /> :
               (isDisputed || isCancelled) ? <AlertTriangle className="w-14 h-14" /> :
               <XCircle className="w-14 h-14" />}
            </div>
            {(isPurePending || isClaimedPending || isAnyProcessing || isPaid) && (
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
            )}
            {isCompleted && (
              <div className="absolute inset-0 bg-green-500/30 blur-3xl rounded-full"></div>
            )}
            {(isDisputed || isCancelled) && (
              <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
            )}
          </div>
          
          <div className="space-y-4">
                <h1 className="text-4xl font-display font-black tracking-tight">
                  {isPurePending ? t('pending') :
                   isClaimedPending ? t('agent_found_awaiting_accept') :
                   isAccepted ? t('agent_accepted_processing') :
                   isProcessing ? t('processing_payment') :
                   isPaid ? t('paid_wait') :
                   isCompleted ? t('completed_header', 'Task Finished!') :
                   isDisputed ? t('disputed_header', 'Under Review') :
                   isCancelled ? t('cancelled_header', 'Cancelled') :
                   t('failed')}
                </h1>
            
            {isDisputed ? (
              <div className="space-y-6">
                <div className="p-8 bg-red-600/20 border-4 border-red-500 rounded-[3rem] animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.3)] text-center space-y-4">
                  <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-red-500 uppercase tracking-tighter">Appeal in Progress</h2>
                    <p className="text-red-400 font-bold leading-tight">
                      Our support team is investigating your claim. All timers are paused.
                    </p>
                  </div>
                </div>
                
                <div className="p-6 glass-dark border border-white/5 rounded-3xl space-y-4">
                  <p className="text-sm text-center text-slate-400">
                    If the problem has been resolved and you have received your payment, you can confirm it below to release the order.
                  </p>
                  <Button 
                    className="w-full h-16 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                    onClick={handleConfirmReceipt}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    I HAVE RECEIVED MY MONEY
                  </Button>
                </div>
              </div>
            ) : (
              <div className={cn(
                  "p-10 rounded-[3rem] border-4 transition-all duration-500 relative overflow-hidden",
                  isAccepted ? "bg-blue-600/20 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]" :
                  isPaid ? "bg-green-600/20 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)] scale-105" :
                  "bg-white/5 border-white/5"
              )}>
                  {/* Decorative background glow */}
                  {(isAccepted || isPaid) && (
                      <motion.div 
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" 
                      />
                  )}

                  <p className={cn(
                      "font-black leading-tight tracking-tight text-center uppercase mb-2 text-xs opacity-50",
                      (isAnyProcessing || isPaid) ? "text-white" : "text-slate-500"
                  )}>
                    Current Status Info
                  </p>

                  <p className={cn(
                      "font-black leading-tight tracking-tight text-center",
                      (isAnyProcessing || isPaid || isClaimedPending) ? "text-3xl sm:text-4xl text-white" : "text-xl text-slate-400"
                  )}>
                    {isPurePending ? t('pending_desc') :
                     isClaimedPending ? t('claimed_pending_desc') :
                     isAccepted ? t('accepted_status_desc') :
                     isProcessing ? t('processing_status_desc') :
                     isPaid ? t('paid_status_desc') :
                     isCompleted ? t('completed_desc') :
                     isDisputed ? t('disputed_desc') :
                     isCancelled ? t('cancelled_desc') :
                     t('failed')}
                  </p>
                  
                  {(isAnyProcessing || isPaid || isClaimedPending) && (
                      <div className="mt-6 flex items-center justify-center gap-2">
                          <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce"></span>
                          </div>
                          <p className="text-xs uppercase tracking-[0.3em] font-black text-slate-500">
                              {isClaimedPending ? 'Agent Assigning' : 
                               isAccepted ? 'Accepting Order' : 
                               isProcessing ? 'Processing Order' :
                               'Confirmation Required'}
                          </p>
                      </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {isAnyProcessing && (
          <Card className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-6 text-center">
            <p className="text-sm font-medium text-blue-400 animate-pulse">
              Admin will pay you within 15 minutes. Please wait.
            </p>
          </Card>
        )}

        {isPaid && (
           <Card className="glass-dark border-brand-blue/40 rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-600/10">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold">
                  {isExchangeFlow ? t('payment_sent_header', 'Money Sent!') : 'Balance Ready!'}
                </h3>
                <p className="text-sm text-slate-400">
                  {isExchangeFlow ? t('check_bank_for_amount', { 
                    bank: (tx.receiver_info?.bankName || tx.receiverInfo?.bankName), 
                    amount: (tx.target_amount || tx.targetAmount), 
                    currency: (tx.target_currency || tx.targetCurrency) 
                  }) : 'Admin has processed your request. Please check your wallet balance and confirm.'}
                </p>
                 <div className={cn(
                   "mt-4 p-8 rounded-[2.5rem] transition-all duration-500 flex flex-col items-center justify-center space-y-4",
                   autoCompleteTime <= 120 
                    ? "bg-red-500/20 border-4 border-red-500 animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.5)]" 
                    : "bg-white/5 border border-white/10"
                 )}>
                   <div className="text-center">
                     <p className={cn(
                       "text-xs md:text-sm uppercase tracking-[0.6em] font-black mb-4",
                       autoCompleteTime <= 120 ? "text-red-400" : "text-slate-500"
                     )}>
                       {t('auto_complete_timer', 'Auto-Complete Timer')}
                     </p>
                     <p className={cn(
                       "text-8xl md:text-[12rem] font-display font-black tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] leading-none",
                       autoCompleteTime <= 120 ? "text-red-500 scale-105 animate-pulse" : "text-white"
                     )}>
                       {formatTime(autoCompleteTime)}
                     </p>
                   </div>

                   <p className={cn(
                     "text-xs font-bold text-center leading-relaxed max-w-[200px]",
                     autoCompleteTime <= 120 ? "text-red-400" : "text-slate-400"
                   )}>
                     {t('auto_complete_warning_text', 'Order will complete automatically when this reaches zero.')}
                   </p>

                   {autoCompleteTime <= 120 && (
                     <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full animate-bounce">
                       <AlertTriangle className="w-4 h-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest">
                         URGENT ACTION REQUIRED
                       </p>
                     </div>
                   )}
                 </div>
              </div>

              {tx.adminProof || tx.admin_proof ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Payment Receipt</p>
                  <div 
                    className="aspect-video rounded-2xl bg-black/40 border border-white/5 overflow-hidden relative group cursor-pointer"
                    onClick={() => {
                      setViewerSrc(tx.adminProof || tx.admin_proof);
                      setIsViewerOpen(true);
                    }}
                  >
                    <img 
                      src={tx.adminProof || tx.admin_proof} 
                      alt="Admin Proof" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Eye className="w-10 h-10 text-white" />
                        <p className="text-sm font-bold text-white uppercase tracking-widest">Enlarge Proof</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <Button 
                  className={cn(
                    "w-full h-20 rounded-3xl font-black text-xl transition-all duration-500",
                    isConfirming ? "bg-slate-800 text-slate-500" : "bg-green-600 hover:bg-green-500 text-white shadow-[0_20px_50px_rgba(34,197,94,0.3)] hover:scale-[1.02] active:scale-95"
                  )}
                  onClick={handleConfirmReceipt}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      CONFIRMING...
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8" />
                      {t('received_the_money', 'I RECEIVED THE MONEY')}
                    </div>
                  )}
                </Button>
                <div className="flex gap-4">
                  <Button 
                    variant="outline"
                    className="flex-1 h-14 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-2xl font-bold"
                    onClick={handleAppealClick}
                  >
                    {t('not_received_appeal', 'Not Received (Appeal)')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isPurePending && (
          <Card className="glass-dark border-brand-blue/20 rounded-[2rem] overflow-hidden">
            <CardContent className="p-8 text-center space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('estimated_waiting_time')}</p>
                <p className="text-7xl md:text-8xl font-display font-black text-brand-blue tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  {formatTime(timeLeft)}
                </p>
              </div>
              
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 1800) * 100}%` }}
                  className="h-full bg-brand-blue"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Section - Collapsible to avoid blocking the view */}
        {(isAnyProcessing || isPaid) && !isDisputed && (
          <div className="space-y-4">
             <Button 
                variant="ghost" 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="w-full h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between px-6 hover:bg-blue-500/20"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-brand-blue" />
                  <span className="font-bold text-sm">Direct Support Chat</span>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-black border-blue-500/30 text-blue-500">
                  {isChatOpen ? 'Close Chat' : 'Open Chat'}
                </Badge>
             </Button>

             <AnimatePresence>
               {isChatOpen && (
                 <motion.div 
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="rounded-[2.5rem] overflow-hidden border border-white/5 glass-dark shadow-2xl h-[500px] relative"
                 >
                    <DisputeChat 
                      txId={txId!} 
                      subAdminId={tx.assigned_sub_admin_id} 
                      title="Direct Support Chat" 
                    />
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        )}

        {/* Pending state notice */}
        {isPurePending && !isCancelled && (
           <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] text-center space-y-4">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                 <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-500 uppercase tracking-tight">Order Awaiting Staff</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">Once an official support agent accepts your order, the direct chat will open here.</p>
              </div>
           </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-dark border-white/5 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">{t('transaction_details')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">{t('amount')}</span>
                <span className="font-bold">{tx.amount?.toLocaleString()} {tx.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Receiver Gets</span>
                <span className="font-bold text-brand-blue">{(tx.target_amount || tx.targetAmount)?.toLocaleString()} {(tx.target_currency || tx.targetCurrency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">{t('type')}</span>
                <span className="capitalize font-bold text-slate-300">{tx.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">{t('status')}</span>
                <Badge className={cn(
                  "capitalize rounded-full px-3 py-1 font-bold",
                  isCompleted ? "bg-green-500/20 text-green-500" :
                  isPurePending ? "bg-yellow-500/20 text-yellow-500" :
                  isClaimedPending ? "bg-orange-500/20 text-orange-500" :
                  isAnyProcessing ? "bg-blue-500/20 text-blue-500" :
                  isPaid ? "bg-green-600/20 text-green-400 animate-pulse border border-green-500/30" :
                  isDisputed ? "bg-red-500/20 text-red-500" :
                  "bg-red-500/20 text-red-500"
                )}>
                  {isClaimedPending ? 'Assigned' : isPaid ? 'Paid' : tx.status}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="glass-dark border-white/5 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">ORDER SUPPORT</h3>
            <p className="text-xs text-slate-500">Need help with your transaction?</p>
            <div className="space-y-4">
              {tx.adminProof && (
                <Button 
                  variant="send" 
                  className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-xl h-12 font-bold border border-blue-500/20"
                  onClick={() => {
                    setViewerSrc(tx.adminProof);
                    setIsViewerOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {t('view_payment_receipt')}
                </Button>
              )}
              {isDisputed ? (
                <Button 
                  className="w-full bg-red-600 hover:bg-red-500 text-white rounded-xl h-14 font-bold flex flex-col justify-center gap-0.5"
                  onClick={() => navigate(`/appeal/${txId}`)}
                >
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  <span>GO TO DISPUTE PAGE</span>
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full border-brand-blue/30 bg-brand-blue/5 hover:bg-brand-blue/10 text-brand-blue rounded-xl h-14 font-bold"
                  onClick={() => navigate('/messages')}
                >
                  <MessageSquare className="w-5 h-5 mr-3" />
                  LIVE ADMIN SUPPORT
                </Button>
              )}

              
              {(tx.status?.toLowerCase().trim() === 'pending' || tx.status?.toLowerCase().trim() === 'disputed') && (
                <div className="space-y-4">
                  {showCancelConfirm ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-3">
                      <p className="text-xs text-red-500 font-bold text-center italic">
                        {t('cancel_request_confirm')}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 hover:bg-white/5 text-xs"
                          onClick={() => setShowCancelConfirm(false)}
                        >
                          {t('keep_request')}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="flex-1 text-xs font-bold"
                          onClick={handleCancel}
                        >
                          {t('confirm_cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      className="w-full text-red-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl h-12 font-medium"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {tx.status?.toLowerCase().trim() === 'disputed' ? t('remove_this_appeal') : t('cancel_this_request')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>


      </div>

      <ImageViewer 
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        src={viewerSrc}
        alt="Payment Proof"
      />

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm rounded-[2rem]">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-display font-bold">{t('confirm_receipt_title', 'Final Confirmation')}</DialogTitle>
            <p className="text-slate-400 text-sm mt-2">Please enter your login password to confirm that you have received the funds in your bank account.</p>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-500 uppercase text-[10px] font-bold tracking-widest">{t('transaction_password')}</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/5 border-white/10 h-14 rounded-2xl text-center text-2xl tracking-[0.3em]"
              />
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
              <p className="text-[10px] text-yellow-500 leading-tight font-bold italic">
                WARNING: Do not confirm if you haven't checked your actual bank balance. This action is irreversible.
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-col">
            <Button 
              onClick={handleConfirmReceipt}
              disabled={isConfirming || !confirmPassword}
              className="w-full h-14 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-green-600/20"
            >
              {isConfirming ? t('completing', 'COMPLETING...') : t('confirm_complete', 'CONFIRM & COMPLETE')}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowPasswordDialog(false)}
              className="w-full h-12 rounded-xl text-slate-500"
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
