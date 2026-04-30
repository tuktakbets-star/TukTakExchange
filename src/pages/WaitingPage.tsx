import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { supabaseService, where, orderBy } from '@/lib/supabaseService';
import { motion } from 'motion/react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  MessageSquare,
  Copy,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Trophy,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw
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
  const { profile } = useAuth();

  const status = tx?.status?.toLowerCase().trim();
  const isPending = status === 'pending';
  const isAccepted = status === 'accepted';
  const isWaitingUserResponse = status === 'waiting_user_response';
  const isCompleted = status === 'completed';
  const isDisputed = status === 'disputed';
  const isCancelled = status === 'cancelled';
  const isExchangeFlow = tx?.type === 'exchange' || tx?.type === 'cash_out' || tx?.type === 'recharge' || tx?.type === 'withdraw';

  const handleAppealClick = async () => {
    if (!txId) return;
    try {
      await supabaseService.updateDocument('transactions', txId, {
        status: 'disputed',
        updated_at: new Date().toISOString()
      });
      navigate(`/appeal/${txId}`);
    } catch (error) {
      navigate(`/appeal/${txId}`);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!txId || !tx || !profile?.email) return;
    
    if (!confirmPassword) {
      toast.error('Please enter your password to confirm receipt');
      return;
    }

    setIsConfirming(true);
    try {
      // Verify Password first
      const { error: authError } = await supabaseService.signIn(profile.email, confirmPassword);
      if (authError) {
        toast.error('Incorrect password. Please try again.');
        setIsConfirming(false);
        return;
      }

      // Avoid double confirmation
      if (tx.status === 'completed') {
        setShowPasswordDialog(false);
        navigate('/wallet');
        return;
      }

      // 1. Transaction status update
      await supabaseService.updateDocument('transactions', txId, { 
        status: 'completed',
        updated_at: new Date().toISOString()
      });

      // 2. Finalize Balance Deduction for User (if not already handled)
      const amountToDeduct = tx.totalToDeduct || tx.amount;
      if (tx.type === 'withdraw' || tx.type === 'exchange' || tx.type === 'recharge') {
          // If the money was already "locked" (pending_locked), we reduce it now.
          await supabaseService.updateWalletBalance(tx.uid, tx.currency, 0, -amountToDeduct);
      }

      // 3. CREDIT SUB-ADMIN WALLET
      // When a user confirms they received funds, the system adds balance to the operator's system wallet
      // as they have successfully fulfilled the transaction using their own liquidity.
      if (tx.assignedSubAdminId) {
        const { data: subAdmin } = await supabaseService.getDocument('sub_admins', tx.assignedSubAdminId);
        if (subAdmin) {
          const newBalance = (subAdmin.wallet_balance || 0) + tx.amount;
          await supabaseService.updateDocument('sub_admins', subAdmin.id, {
            wallet_balance: newBalance
          });

          // Log the credit
          await supabaseService.addDocument('sub_admin_wallet_transactions', {
            sub_admin_id: subAdmin.id,
            type: 'deposit',
            amount: tx.amount,
            reason: `Order ${txId} completed by user confirmation`,
            order_id: txId,
            balance_after: newBalance,
            created_at: new Date().toISOString()
          });
        }
      }

      setShowPasswordDialog(false);
      toast.success('Transaction completed successfully!');
      setTimeout(() => navigate('/wallet'), 1500);
    } catch (error) {
      toast.error('Failed to complete transaction');
      setIsConfirming(false);
    }
  };

  useEffect(() => {
    if (!txId) return;

    const unsub = supabaseService.subscribeToDocument('transactions', txId, (data) => {
      if (data) {
        setTx(data);
        const createdAtStr = data.createdAt || data.created_at;
        if (createdAtStr) {
          const createdAt = new Date(createdAtStr).getTime();
          const now = new Date().getTime();
          const elapsed = Math.floor((now - createdAt) / 1000);
          const remaining = Math.max(0, 1800 - elapsed);
          setTimeLeft(remaining);

          if (data.status?.toLowerCase().trim() === 'waiting_user_response') {
            const paidAtStr = data.subAdminActionedAt || data.sub_admin_actioned_at;
            const paidAt = paidAtStr ? new Date(paidAtStr).getTime() : now;
            const paidElapsed = Math.floor((now - paidAt) / 1000);
            const paidRemaining = Math.max(0, 600 - paidElapsed); // 10 mins
            setAutoCompleteTime(paidRemaining);
          }
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [txId]);

  useEffect(() => {
    // Auto-redirect to wallet after 5 seconds if transaction is in a terminal state
    const terminalStates = ['completed', 'cancelled', 'rejected', 'expired'];
    if (tx?.status && terminalStates.includes(tx.status?.toLowerCase())) {
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
    if (tx?.status?.toLowerCase().trim() !== 'waiting_user_response' || isDisputed) return;

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
        const amountToRefund = tx.totalToDeduct || tx.amount;
        await supabaseService.updateWalletBalance(tx.uid, tx.currency, 0, -amountToRefund);
      }

      // Update status to cancelled instead of deleting (so it shows in history)
      await supabaseService.updateDocument('transactions', txId, {
        status: 'cancelled',
        updated_at: new Date().toISOString()
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
              (isPending || isAccepted || isWaitingUserResponse) ? "bg-blue-500/10 text-blue-500" :
              isCompleted ? "bg-green-500/20 text-green-500" :
              (isDisputed || isCancelled) ? "bg-red-500/20 text-red-500" :
              "bg-red-500/10 text-red-500"
            )}>
              {(isPending || isAccepted || isWaitingUserResponse) ? <Clock className="w-14 h-14 animate-pulse" /> :
               isCompleted ? <Trophy className="w-14 h-14" /> :
               (isDisputed || isCancelled) ? <AlertTriangle className="w-14 h-14" /> :
               <XCircle className="w-14 h-14" />}
            </div>
            {(isPending || isAccepted || isWaitingUserResponse) && (
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
              {isPending ? t('pending') :
               isAccepted ? t('order_accepted_header', 'Order Received!') :
               isWaitingUserResponse ? t('payment_sent_header', 'Money Sent!') :
               isCompleted ? t('completed_header', 'Task Finished!') :
               isDisputed ? t('disputed_header', 'Under Review') :
               isCancelled ? t('cancelled_header', 'Cancelled') :
               t('failed')}
            </h1>
            
            {isDisputed ? (
              <div className="p-8 bg-red-600/20 border-4 border-red-500 rounded-[3rem] animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.3)] text-center space-y-4 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => navigate(`/dispute-chat/${txId}`)}
              >
                <div className="flex flex-col items-center">
                  <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
                  <div className="bg-red-500 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest -mt-2 mb-2">
                    Enter Dispute Chat
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-red-500 uppercase tracking-tighter">Appeal in Progress</h2>
                  <p className="text-red-400 font-bold leading-tight">
                    Our support team is investigating your claim. Click here to join the discussion.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-red-500/60 font-black text-[10px] uppercase tracking-[0.3em] pt-4">
                   <RefreshCw className="w-3 h-3 animate-spin" />
                   Reviewing Evidence
                </div>
              </div>
            ) : (
              <div className={cn(
                  "p-10 rounded-[3rem] border-4 transition-all duration-500 relative overflow-hidden",
                  isAccepted ? "bg-blue-600/20 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]" :
                  isWaitingUserResponse ? "bg-green-600/20 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)] scale-105" :
                  "bg-white/5 border-white/5"
              )}>
                  {/* Decorative background glow */}
                  {(isAccepted || isWaitingUserResponse) && (
                      <motion.div 
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" 
                      />
                  )}

                  <p className={cn(
                      "font-black leading-tight tracking-tight text-center uppercase mb-2 text-xs opacity-50",
                      (isAccepted || isWaitingUserResponse) ? "text-white" : "text-slate-500"
                  )}>
                    Current Status Info
                  </p>

                  <p className={cn(
                      "font-black leading-tight tracking-tight text-center",
                      (isAccepted || isWaitingUserResponse) ? "text-3xl sm:text-4xl text-white" : "text-xl text-slate-400"
                  )}>
                    {isPending ? t('pending_desc') :
                     isAccepted ? t('accepted_desc') :
                     isWaitingUserResponse ? t('paid_desc') :
                     isCompleted ? t('completed_desc') :
                     isDisputed ? t('disputed_desc') :
                     isCancelled ? t('cancelled_desc') :
                     t('failed')}
                  </p>
                  
                  {(isAccepted || isWaitingUserResponse) && (
                      <div className="mt-6 flex items-center justify-center gap-2">
                          <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce"></span>
                          </div>
                          <p className="text-xs uppercase tracking-[0.3em] font-black text-slate-500">
                              {isAccepted ? 'Processing Payment' : 'Confirmation Required'}
                          </p>
                      </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {isAccepted && (
          <Card className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-6 text-center">
            <p className="text-sm font-medium text-blue-400 animate-pulse">
              Admin will pay you within 15 minutes. Please wait.
            </p>
          </Card>
        )}

        {isWaitingUserResponse && isExchangeFlow && (
           <Card className="glass-dark border-brand-blue/40 rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-600/10">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold">{t('payment_sent_header', 'Money Sent!')}</h3>
                <p className="text-sm text-slate-400">
                  {t('check_bank_for_amount', { 
                    bank: (tx.receiver_info?.bankName || tx.receiverInfo?.bankName || 'Your Account'), 
                    amount: (tx.target_amount || tx.targetAmount || tx.amount), 
                    currency: (tx.target_currency || tx.targetCurrency || 'BDT') 
                  })}
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

              {(tx.paymentReceiptUrl || tx.payment_receipt_url) && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Payment Receipt</p>
                  <div 
                    className="aspect-video rounded-2xl bg-black/40 border border-white/5 overflow-hidden relative group cursor-pointer"
                    onClick={() => {
                      setViewerSrc(tx.paymentReceiptUrl || tx.payment_receipt_url);
                      setIsViewerOpen(true);
                    }}
                  >
                    <img 
                      src={tx.paymentReceiptUrl || tx.payment_receipt_url} 
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
              )}

              <div className="flex flex-col gap-3">
                <Button 
                  className={cn(
                    "w-full h-20 rounded-3xl font-black text-xl transition-all duration-500",
                    isConfirming ? "bg-slate-800 text-slate-500" : "bg-green-600 hover:bg-green-500 text-white shadow-[0_20px_50px_rgba(34,197,94,0.3)] hover:scale-[1.02] active:scale-95"
                  )}
                  onClick={() => setShowPasswordDialog(true)}
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

        {isPending && (
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

        {tx.status === 'pending' && (
          <div className="space-y-4">
            <h3 className="font-display font-bold text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-blue" />
              {t('chat_with_admin')}
            </h3>
            <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
               <div className="h-[300px] overflow-y-auto p-4 space-y-4" id="chat-messages">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-white/10 rounded-2xl p-3 text-sm">
                      Hello! I am reviewing your deposit. Please wait a moment.
                    </div>
                  </div>
               </div>
               <div className="p-4 border-t border-white/5 bg-white/5 flex gap-2">
                  <Input 
                    placeholder={t('type_message')} 
                    className="bg-slate-900 border-white/10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) {
                          toast.success(t('message_sent_to_admin'));
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <Button size="icon" className="bg-brand-blue">
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
               </div>
            </Card>
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
                <span className="text-slate-500 text-sm">Status</span>
                <Badge className={cn(
                  "capitalize rounded-full px-3 py-1 font-bold",
                  tx.status?.toLowerCase().trim() === 'completed' ? "bg-green-500/20 text-green-500" :
                  tx.status?.toLowerCase().trim() === 'pending' ? "bg-yellow-500/20 text-yellow-500" :
                  tx.status?.toLowerCase().trim() === 'accepted' ? "bg-blue-500/20 text-blue-500" :
                  tx.status?.toLowerCase().trim() === 'waiting_user_response' ? "bg-indigo-500/20 text-indigo-500" :
                  "bg-red-500/20 text-red-500"
                )}>
                  {tx.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="glass-dark border-white/5 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">{t('need_help')}</h3>
            <p className="text-xs text-slate-500">{t('need_help_desc')}</p>
            <div className="space-y-4">
              {(tx.paymentReceiptUrl || tx.payment_receipt_url) && (
                <Button 
                  variant="send" 
                  className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-xl h-12 font-bold border border-blue-500/20"
                  onClick={() => {
                    setViewerSrc(tx.paymentReceiptUrl || tx.payment_receipt_url);
                    setIsViewerOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {t('view_payment_receipt')}
                </Button>
              )}
              <Button 
                variant="outline" 
                className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl h-12 font-bold"
                onClick={() => navigate('/messages')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('live_chat_support')}
              </Button>
              
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
