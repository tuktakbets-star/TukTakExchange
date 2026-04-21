import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { firebaseService } from '../lib/firebaseService';
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
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [autoCompleteTime, setAutoCompleteTime] = useState(300); // 5 minutes in seconds

  const handleConfirmReceipt = async () => {
    if (!txId || !tx) return;
    try {
      // 1. Finalize Balance Deduction (Move from pendingLocked to real deduction)
      const amountToDeduct = tx.totalToDeduct || tx.amount;
      await firebaseService.updateWalletBalance(tx.uid, tx.currency, -amountToDeduct, -amountToDeduct);

      // 2. Update transaction status
      await firebaseService.updateDocument('transactions', txId, { 
        status: 'completed',
        updatedAt: new Date().toISOString()
      });

      toast.success('Transaction completed successfully!');
    } catch (error) {
      toast.error('Failed to complete transaction');
    }
  };

  useEffect(() => {
    if (!txId) return;

    const unsub = firebaseService.subscribeToDocument('transactions', txId, (data) => {
      if (data) {
        setTx(data);
        // If transaction is already old, calculate remaining time
        const createdAt = new Date(data.createdAt).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - createdAt) / 1000);
        const remaining = Math.max(0, 1800 - elapsed);
        setTimeLeft(remaining);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [txId]);

  useEffect(() => {
    // Auto-redirect to wallet after 5 seconds if transaction is approved
    if (tx?.status === 'completed') {
      const timer = setTimeout(() => {
        navigate('/wallet');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tx?.status, navigate]);

  useEffect(() => {
    if (timeLeft <= 0 || tx?.status !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-fail if timeout
          if (tx?.status === 'pending') {
            firebaseService.updateDocument('transactions', txId!, { status: 'expired' });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, tx?.status, txId]);

  useEffect(() => {
    if (tx?.status !== 'paid') return;

    const timer = setInterval(() => {
      setAutoCompleteTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-confirm receipt
          handleConfirmReceipt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tx?.status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
        await firebaseService.updateWalletBalance(tx.uid, tx.currency, 0, -(tx.totalToDeduct || tx.amount));
      }

      // Update status to cancelled instead of deleting (so it shows in history)
      await firebaseService.updateDocument('transactions', txId, {
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

  const isExchangeFlow = tx.type === 'exchange' || tx.type === 'cash_out' || tx.type === 'recharge' || tx.type === 'withdraw';
  const isPending = tx.status === 'pending';
  const isAccepted = tx.status === 'accepted';
  const isPaid = tx.status === 'paid';
  const isCompleted = tx.status === 'completed';
  const isDisputed = tx.status === 'disputed';
  const isCancelled = tx.status === 'cancelled';

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
              (isPending || isAccepted || isPaid) ? "bg-blue-500/10 text-blue-500" :
              isCompleted ? "bg-green-500/20 text-green-500" :
              (isDisputed || isCancelled) ? "bg-red-500/20 text-red-500" :
              "bg-red-500/10 text-red-500"
            )}>
              {(isPending || isAccepted || isPaid) ? <Clock className="w-14 h-14 animate-pulse" /> :
               isCompleted ? <Trophy className="w-14 h-14" /> :
               (isDisputed || isCancelled) ? <AlertTriangle className="w-14 h-14" /> :
               <XCircle className="w-14 h-14" />}
            </div>
            {(isPending || isAccepted || isPaid) && (
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
               isPaid ? t('payment_sent_header', 'Money Sent!') :
               isCompleted ? t('completed_header', 'Task Finished!') :
               isDisputed ? t('disputed_header', 'Under Review') :
               isCancelled ? t('cancelled_header', 'Cancelled') :
               t('failed')}
            </h1>
            
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
                    (isAccepted || isPaid) ? "text-white" : "text-slate-500"
                )}>
                  Current Status Info
                </p>

                <p className={cn(
                    "font-black leading-tight tracking-tight text-center",
                    (isAccepted || isPaid) ? "text-3xl sm:text-4xl text-white" : "text-xl text-slate-400"
                )}>
                  {isPending ? t('pending_desc') :
                   isAccepted ? t('accepted_desc') :
                   isPaid ? t('paid_desc') :
                   isCompleted ? t('completed_desc') :
                   isDisputed ? t('disputed_desc') :
                   isCancelled ? t('cancelled_desc') :
                   t('failed')}
                </p>
                
                {(isAccepted || isPaid) && (
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
          </div>
        </div>

        {isAccepted && (
          <Card className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-6 text-center">
            <p className="text-sm font-medium text-blue-400 animate-pulse">
              Admin will pay you within 15 minutes. Please wait.
            </p>
          </Card>
        )}

        {isPaid && isExchangeFlow && (
           <Card className="glass-dark border-brand-blue/40 rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-600/10">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold">{t('action_required')}</h3>
                <p className="text-sm text-slate-400">
                  {t('action_required_desc')}
                </p>
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <p className="text-sm font-bold text-red-500">
                    {t('auto_complete_warning', { time: formatTime(autoCompleteTime) })}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {tx.type === 'recharge' 
                    ? t('admin_confirmed_recharge', { phone: tx.rechargeDetails?.phoneNumber })
                    : tx.type === 'withdraw'
                    ? t('admin_sent_money', { amount: tx.amount, currency: tx.currency })
                    : t('check_bank_for_amount', { bank: tx.receiverInfo?.bankName, amount: tx.targetAmount, currency: tx.targetCurrency })}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  className="w-full h-14 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold text-lg"
                  onClick={handleConfirmReceipt}
                >
                  {tx.type === 'recharge' ? t('confirm_and_finish') : t('received_the_money')}
                </Button>
                {tx.type !== 'recharge' && (
                  <div className="flex gap-4">
                    <Button 
                      variant="outline"
                      className="flex-1 h-14 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-2xl font-bold"
                      onClick={() => navigate(`/appeal/${txId}`)}
                    >
                      {t('not_received_appeal')}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isPending && (
          <Card className="glass-dark border-brand-blue/20 rounded-[2rem] overflow-hidden">
            <CardContent className="p-8 text-center space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('estimated_waiting_time')}</p>
                <p className="text-5xl font-display font-bold text-brand-blue tabular-nums">
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
                <span className="font-bold">{tx.amount.toLocaleString()} {tx.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">{t('type')}</span>
                <span className="capitalize font-medium">{t(tx.type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">{t('method')}</span>
                <span className="font-medium">Bank Transfer</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">{t('status')}</span>
                <Badge className={cn(
                  "capitalize",
                  tx.status === 'completed' ? "bg-green-500/20 text-green-500" :
                  tx.status === 'pending' ? "bg-yellow-500/20 text-yellow-500" :
                  "bg-red-500/20 text-red-500"
                )}>
                  {t(tx.status)}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="glass-dark border-white/5 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">{t('need_help')}</h3>
            <p className="text-xs text-slate-500">{t('need_help_desc')}</p>
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
              <Button 
                variant="outline" 
                className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl h-12 font-bold"
                onClick={() => navigate('/messages')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('live_chat_support')}
              </Button>
              
              {(tx.status === 'pending' || tx.status === 'disputed') && (
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
                      {tx.status === 'disputed' ? t('remove_this_appeal') : t('cancel_this_request')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {tx.type === 'send' && tx.status === 'pending' && tx.adminProof && (
          <Card className="glass-dark border-green-500/20 rounded-[2rem] overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <Badge className="bg-green-500/20 text-green-500 mb-2">{t('admin_paid')}</Badge>
                <h3 className="text-xl font-bold">{t('admin_sent_money_title')}</h3>
                <p className="text-sm text-slate-400">{t('admin_sent_money_desc')}</p>
              </div>
              
              <div 
                className="aspect-video rounded-2xl bg-black/40 border border-white/5 overflow-hidden relative group cursor-pointer"
                onClick={() => {
                  setViewerSrc(tx.adminProof);
                  setIsViewerOpen(true);
                }}
              >
                <img src={tx.adminProof} alt="Admin Proof" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Eye className="w-10 h-10 text-white" />
                    <p className="text-sm font-bold text-white uppercase tracking-widest">Enlarge Proof</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  className="flex-1 h-14 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold"
                  onClick={handleConfirmReceipt}
                >
                  I RECEIVED
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 h-14 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-2xl font-bold"
                  onClick={() => navigate(`/appeal/${txId}`)}
                >
                  NOT RECEIVED
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ImageViewer 
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        src={viewerSrc}
        alt="Payment Proof"
      />
    </div>
  );
}
