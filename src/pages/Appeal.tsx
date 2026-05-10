import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { supabaseService } from '../lib/supabaseService';
import { 
  AlertTriangle, 
  MessageSquare, 
  ArrowLeft, 
  Send,
  Upload,
  CheckCircle2,
  FileText,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { DisputeChat } from '@/components/DisputeChat';
import { Badge } from '@/components/ui/badge';

export default function Appeal() {
  const { t } = useTranslation();
  const { txId } = useParams();
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tx, setTx] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const operatorSession = JSON.parse(sessionStorage.getItem('operator_session') || '{}');
  const isOperator = !!operatorSession.id;
  const canModify = isAdmin || (isOperator && tx?.assigned_sub_admin_id === operatorSession.id);

  useEffect(() => {
    if (!txId) return;
    const unsub = supabaseService.subscribeToDocument('transactions', txId, (data) => {
      setTx(data);
    });
    return () => unsub();
  }, [txId]);

  const handleResolve = async (action: 'complete' | 'refund') => {
    if (!txId || !tx) return;
    setIsConfirming(true);
    try {
      if (action === 'complete') {
        const amount = tx.amount || 0;
        const totalToDeduct = tx.total_to_deduct || tx.totalToDeduct || amount;
        
        // Finalize transaction
        await supabaseService.updateDocument('transactions', txId, { 
          status: 'completed',
          updated_at: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // 1. Release User Wallet Balance
        const isAddMoney = tx.type === 'add_money' || tx.type === 'cash_in';
        if (isAddMoney) {
          // User gets real balance
          await supabaseService.updateWalletBalance(tx.uid, tx.currency, amount, 0);
          
          // Add User Wallet History
          await supabaseService.addDocument('wallet_transactions', {
            uid: tx.uid,
            type: 'deposit',
            amount: amount,
            currency: tx.currency,
            description: `Balance added via Order #${txId}`,
            status: 'completed',
            created_at: new Date().toISOString()
          });
        } else {
          // User lost balance (was locked), move from locked to real deduction
          await supabaseService.updateWalletBalance(tx.uid, tx.currency, -totalToDeduct, -totalToDeduct);
          
          // Add User Wallet History
          await supabaseService.addDocument('wallet_transactions', {
            uid: tx.uid,
            type: 'withdraw',
            amount: totalToDeduct,
            currency: tx.currency,
            description: `Deducted for Order #${txId}`,
            status: 'completed',
            created_at: new Date().toISOString()
          });
        }

        // Consolidated Sub-admin balance update logic
        const saId = tx.assigned_sub_admin_id || tx.assignedSubAdminId;
        if (saId) {
          const { data: subAdmin } = await supabaseService.getDocument('sub_admins', saId);
          if (subAdmin) {
            const currentBal = Number(subAdmin.vndBalance || subAdmin.walletBalance || 0);
            const isAddMoney = tx.type === 'add_money' || tx.type === 'cash_in';
            const amount = tx.amount || 0;
            const totalToDeduct = tx.totalToDeduct || amount;
            
            // Logic: if adding money, SA loses balance. if withdrawing/exchange, SA gains the digital credit.
            const delta = isAddMoney ? -amount : totalToDeduct;
            const newSaBalance = currentBal + delta;
            
            await supabaseService.updateDocument('sub_admins', saId, {
              vnd_balance: newSaBalance,
              wallet_balance: newSaBalance,
              last_resolved_dispute: txId,
              updated_at: new Date().toISOString()
            });
            
            await supabaseService.addDocument('sub_admin_wallet_transactions', {
              sub_admin_id: saId,
              type: delta < 0 ? 'debit' : 'credit',
              amount: Math.abs(delta),
              reason: `Order #${txId} resolved via Appeal (Complete)`,
              order_id: txId,
              balance_after: newSaBalance,
              created_at: new Date().toISOString()
            });
          }
        }
        toast.success('Dispute resolved: Transaction Completed');
      } else {
        // Refund/Reject logic
        const amount = tx.amount || 0;
        const totalToDeduct = tx.total_to_deduct || tx.totalToDeduct || amount;
        const needsRefund = tx.type === 'withdraw' || tx.type === 'exchange' || tx.type === 'recharge' || tx.type === 'cash_out';

        if (needsRefund) {
          // Release locked balance back to available
          await supabaseService.updateWalletBalance(tx.uid, tx.currency, 0, -totalToDeduct);
        }

        await supabaseService.updateDocument('transactions', txId, { 
          status: 'failed',
          updated_at: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Note: Full refund logic depends on currency and wallet structure
        toast.success('Dispute resolved: Transaction Failed/Refunded');
      }
      
      // Navigate back - ensure correct path based on session
      setTimeout(() => {
        const operatorSession = sessionStorage.getItem('operator_session');
        if (operatorSession || location.pathname.includes('/operator/')) {
          navigate('/operator/dashboard');
        } else if (isAdmin || location.pathname.includes('/admin-dashboard/')) {
          navigate('/admin-dashboard/disputes');
        } else {
          navigate('/wallet');
        }
      }, 1500);
      
    } catch (error) {
      toast.error('Failed to resolve dispute');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await supabaseService.updateDocument('transactions', txId!, {
        status: 'disputed',
        dispute_reason: reason,
        dispute_description: description,
        disputeInfo: {
          reason,
          description,
          openedAt: new Date().toISOString(),
          status: 'open',
          proofUrl: proofFile ? 'https://picsum.photos/seed/dispute/800/600' : null
        }
      });

      await supabaseService.addDocument('notifications', {
        uid: 'admin',
        title: 'New Dispute Filed',
        message: `User ${profile?.displayName} has filed a dispute for transaction ${txId?.substring(0, 8)}`,
        type: 'dispute',
        txId: txId,
        createdAt: new Date().toISOString(),
        read: false
      });

      toast.success('Dispute filed successfully.');
    } catch (error) {
      toast.error('Failed to file dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tx) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;

    const isDisputed = tx.status === 'disputed';
    const isSupport = !isDisputed;

    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
        <div className="flex flex-col gap-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="text-slate-400 w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
  
          <div className={cn(
            "flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[2.5rem] border transition-all duration-700",
            isDisputed ? "bg-red-500/5 border-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.05)]" : "bg-blue-500/5 border-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.05)]"
          )}>
            <div className="flex items-center gap-5">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform hover:rotate-12",
                isDisputed ? "bg-red-500/10 text-red-500" : "bg-blue-500/20 text-blue-500"
              )}>
                {isDisputed ? <ShieldAlert className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
              </div>
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight">
                  {isDisputed ? 'Active Dispute Case' : 'Direct Support Chat'}
                </h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
                  TX #{txId?.substring(0, 8).toUpperCase()} • {isDisputed ? 'Moderator Involved' : '1-on-1 Communication'}
                </p>
              </div>
            </div>
            
            <Badge className={cn(
              "px-5 py-2 rounded-full font-black uppercase tracking-widest text-[10px] shadow-lg",
              isDisputed ? "bg-red-500 text-white shadow-red-500/20" : "bg-blue-600 text-white shadow-blue-600/20"
            )}>
              {tx.status?.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
  
      { (isDisputed || isOperator || isAdmin) ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className={cn(
              "glass-dark border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl h-[750px] flex flex-col ring-4 ring-white/5",
              isDisputed && "border-red-500/30 ring-red-500/10"
            )}>
              <CardHeader className={cn(
                "p-8 border-b border-white/10",
                isDisputed ? "bg-red-500/10" : "bg-blue-500/10"
              )}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isDisputed ? (
                      <>
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                        <span className="text-xl font-black uppercase tracking-tighter">Conflict Resolution Centre</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-6 h-6 text-blue-400" />
                        <span className="text-xl font-black uppercase tracking-tighter">Support Messenger</span>
                      </>
                    )}
                  </div>
                  {isDisputed ? (
                    <Badge className="bg-red-500 text-white animate-pulse">Official Case</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-400 font-black">Secured Line</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-hidden p-0">
                <DisputeChat 
                  txId={txId!} 
                  subAdminId={tx.assigned_sub_admin_id} 
                  title={isDisputed ? "Dispute Resolution Group" : "Transaction Support Chat"} 
                />
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            {isDisputed && (
              <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <h3 className="font-bold text-lg">Case Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason</label>
                    <p className="font-bold mt-1">{tx.dispute_reason || tx.disputeInfo?.reason || 'No reason'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed italic">"{tx.dispute_description || tx.disputeInfo?.description || 'No description'}"</p>
                  </div>
                  {tx.disputeInfo?.proofUrl && (
                    <Button 
                      variant="outline" 
                      className="w-full h-11 border-white/10 hover:bg-white/5 text-xs font-bold"
                      onClick={() => window.open(tx.disputeInfo.proofUrl, '_blank')}
                    >
                      View Proof Document
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {canModify && isDisputed && (
              <Card className="glass-dark border-red-500/20 rounded-[2.5rem] p-8 space-y-6">
                <h3 className="font-bold text-lg text-red-500">Resolve Dispute</h3>
                <div className="space-y-4">
                  <div>
                    <Button 
                      onClick={() => handleResolve('complete')}
                      disabled={isConfirming}
                      className="w-full h-14 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold shadow-lg shadow-green-600/20"
                    >
                      Approve Payment (Release Funds)
                    </Button>
                    <p className="text-[10px] text-slate-500 mt-2 text-center uppercase tracking-widest font-bold">Release locked balance to the receiver</p>
                  </div>
                  <div>
                    <Button 
                      onClick={() => handleResolve('refund')}
                      disabled={isConfirming}
                      variant="ghost"
                      className="w-full h-14 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-2xl font-bold border border-red-500/20"
                    >
                      Refund & Close (Return Funds)
                    </Button>
                    <p className="text-[10px] text-slate-500 mt-2 text-center uppercase tracking-widest font-bold">Return locked balance to the sender</p>
                  </div>
                </div>
              </Card>
            )}

            {!canModify && !isAdmin && isDisputed && (
              <Card className="bg-green-600/5 border border-green-600/10 rounded-[2.5rem] p-8">
                 <div className="flex flex-col gap-4 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-200">Got your money?</p>
                    <p className="text-xs text-slate-500 italic">If the sub-admin or admin fixed the issue, you can close this now.</p>
                    <Button 
                      onClick={() => handleResolve('complete')}
                      className="w-full h-12 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold"
                    >
                      Release Everything
                    </Button>
                 </div>
              </Card>
            )}
            
            {!canModify && !isAdmin && !isDisputed && (
              <div className="p-8 text-center bg-white/5 rounded-[2.5rem] border border-white/5">
                <p className="text-xs text-slate-500 italic uppercase tracking-widest font-bold">Standard Support Chat</p>
                <p className="text-[10px] text-slate-600 mt-2">Use this chat for general inquiries. To report a payment issue, use the File Appeal button on the order page.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 border-b border-white/5">
            <CardTitle className="text-xl">Describe your problem</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason for Appeal</Label>
                <Input 
                  placeholder="e.g. Payment not received, Incorrect amount" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 font-bold"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detailed Description</Label>
                <Textarea 
                  placeholder="Please describe the issue in detail..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white/5 border-white/10 min-h-[150px] rounded-2xl p-6 leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Upload Evidence (Optional)</Label>
                <div 
                  className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center hover:border-blue-500/50 transition-all cursor-pointer group"
                  onClick={() => document.getElementById('proof-upload')?.click()}
                >
                  <input 
                    id="proof-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                  {proofFile ? (
                    <div className="flex flex-col items-center gap-3 text-blue-500">
                      <FileText className="w-10 h-10" />
                      <span className="text-sm font-bold uppercase tracking-widest">{proofFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <Upload className="w-10 h-10 text-slate-600 group-hover:text-blue-500 transition-colors" />
                      <div>
                        <p className="text-sm font-bold text-slate-400">Click or drag bank statement</p>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">Recommended: Screenshot of payment app</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-16 bg-red-600 hover:bg-red-500 text-white rounded-3xl font-black text-lg shadow-2xl shadow-red-600/30 transition-transform active:scale-95"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!isDisputed && (
        <Card className="bg-yellow-500/5 border border-yellow-500/10 rounded-[2.5rem] p-8">
          <div className="flex gap-6">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="space-y-2">
              <p className="font-black text-lg text-yellow-500">Important Information</p>
              <p className="text-sm text-slate-400 leading-relaxed italic">
                Appeals are reviewed manually by our administration team. This process can take up to 24 hours. 
                Please provide as much information as possible to expedite your request.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
