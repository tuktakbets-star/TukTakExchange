import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Calendar,
  Info,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  History,
  X,
  Globe,
  CircleDollarSign,
  UserCircle,
  Camera,
  Eye
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabaseService, where, orderBy, limit } from '@/lib/supabaseService';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { ImageViewer } from '@/components/ImageViewer';

import { useNavigate } from 'react-router-dom';

export default function OperatorWallet() {
  const navigate = useNavigate();
  const [operator, setOperator] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [loading, setLoading] = useState(true);
  const [requestDialog, setRequestDialog] = useState<{ open: boolean, type: 'refill' | 'withdraw' }>({ open: false, type: 'refill' });
  const [requestForm, setRequestForm] = useState({
    amount: '',
    country: 'Bangladesh',
    balanceType: 'VND',
    accountType: 'Bkash',
    withdrawalAccountName: '',
    withdrawalAccountNumber: '',
    tx_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [adminBankSettings, setAdminBankSettings] = useState<any>(null);
  const [adminBanks, setAdminBanks] = useState<any[]>([]);

  useEffect(() => {
    const sessionStr = sessionStorage.getItem('operator_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);

    fetchAdminBanks();
    fetchAdminBankSettings();

    // Subscribe to operator doc
    const unsubOp = supabaseService.subscribeToDocument('sub_admins', session.id, (data) => {
      if (data) setOperator(data);
    });

    // Subscribe to wallet transactions
    const unsubTx = supabaseService.subscribeToCollection('sub_admin_wallet_transactions', [
      where('sub_admin_id', '==', session.id && !isNaN(Number(session.id)) ? Number(session.id) : session.id),
      orderBy('created_at', 'desc')
    ], (updated) => {
      const processed = updated.map(tx => ({
        ...tx,
        created_at: tx.created_at?.toDate ? tx.created_at.toDate().toISOString() : tx.created_at
      }));
      setTransactions(processed);
      setLoading(false);
    });

    return () => {
      unsubOp();
      unsubTx();
    };
  }, []);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchAdminBanks = async () => {
    const data = await supabaseService.getCollection('admin_banks', [where('status', '==', 'active')]);
    if (data) setAdminBanks(data);
  };

  const fetchAdminBankSettings = async () => {
    const data = await supabaseService.getCollection('admin_settings', []);
    const settings = data?.find((s: any) => s.key === 'sub_admin_refill_bank');
    if (settings) {
      setAdminBankSettings(settings.value);
    }
  };

  const flow = getTotalFlow();

  // Sync ledger balance to DB to fix discrepancies
  useEffect(() => {
    if (operator && transactions.length > 0) {
      const ledgerBalance = flow.credit - flow.debit;
      // Check multiple possible field names just in case
      const currentDbBalance = operator.walletBalance ?? operator.wallet_balance ?? operator.vndBalance ?? operator.vnd_balance ?? 0;
      
      if (Math.abs(currentDbBalance - ledgerBalance) > 1) { // 1 unit threshold
        const targetId = !isNaN(Number(operator.id)) ? Number(operator.id) : operator.id;
        supabaseService.updateDocument('sub_admins', targetId, {
          walletBalance: ledgerBalance,
          wallet_balance: ledgerBalance,
          vndBalance: ledgerBalance,
          vnd_balance: ledgerBalance,
          updatedAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  }, [operator?.id, transactions, flow.credit, flow.debit]);

  function getTotalFlow() {
    const creditTypes = ['credit', 'deposit', 'refill', 'adjustment_add', 'bonus'];
    const debitTypes = ['debit', 'withdraw', 'adjustment_sub', 'fee'];

    const credit = transactions.filter(tx => creditTypes.includes(tx.type)).reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const debit = transactions.filter(tx => debitTypes.includes(tx.type)).reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    
    return { credit, debit };
  };

  const handleFinalSubmit = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!operator?.id) {
        toast.error('Session error. Please login again.');
        return;
      }

      const numAmount = Number(requestForm.amount);
      const ledgerBalance = flow.credit - flow.debit;
      
      if (requestDialog.type === 'withdraw' && numAmount > ledgerBalance) {
        toast.error('Insufficient balance for withdrawal');
        setIsSubmitting(false);
        return;
      }
      
      let proofUrl = '';
      if (proofFile) {
        proofUrl = await supabaseService.uploadFile(proofFile);
      }

      const requestPayload = {
        sub_admin_id: operator.id,
        username: operator.username,
        type: requestDialog.type,
        amount: numAmount,
        country: requestForm.country,
        balance_type: requestForm.balanceType,
        account_type: requestForm.accountType,
        withdrawal_account_name: requestForm.withdrawalAccountName,
        withdrawal_account_number: requestForm.withdrawalAccountNumber,
        proof_url: proofUrl,
        tx_id: requestForm.tx_id || '',
        admin_bank_info: adminBanks[0] || null,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      await supabaseService.addDocument('operator_balance_requests', requestPayload);
      
      toast.success('Request sent successfully!');
      setRequestDialog(prev => ({ ...prev, open: false }));
      
      // Navigate using the saved state or params
      navigate(`/operator/status?id=${operator.id}&type=${requestDialog.type}&amount=${numAmount}&currency=${requestForm.balanceType}`);
    } catch (e) {
      toast.error('Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'all') return true;
    return tx.type === filterType;
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
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white font-black">My Operator Wallet</h1>
          <p className="text-slate-500 mt-1 font-medium text-[10px] sm:text-sm uppercase tracking-widest">Balance & Transactions</p>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 sm:p-12 h-full bg-[#161b22] border border-white/10 rounded-[2rem] sm:rounded-[3rem] relative overflow-hidden group shadow-2xl flex flex-col justify-center"
          >
             <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-purple-600/10 blur-[120px] rounded-full translate-x-32 -translate-y-32 group-hover:scale-125 transition-transform duration-1000" />
             
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
                <div className="space-y-3 sm:space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                        <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Current Working Balance</span>
                   </div>
                   <div className="flex items-baseline gap-2">
                     <span className="text-3xl sm:text-6xl font-black text-white tracking-tighter shadow-blue-500/20">{operator?.balanceType === 'BDT' ? '৳' : operator?.balanceType === 'USDT' ? '$' : '₫'}{(flow.credit - flow.debit).toLocaleString()}</span>
                   </div>
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                      <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
                      <span className="text-[9px] sm:text-[10px] font-black text-green-500 uppercase tracking-widest">Secured by Admin</span>
                   </div>
                </div>

                <div className="md:w-64 space-y-3 sm:space-y-4">
                   <div className="p-3 sm:p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3 sm:gap-4 text-slate-400">
                      <Info className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
                      <p className="text-[9px] sm:text-[10px] font-bold leading-tight uppercase italic">Notice: Refills must be done through Administrator.</p>
                   </div>
                   <div className="flex gap-2">
                     <Button 
                       onClick={() => {
                        setRequestDialog({ open: true, type: 'refill' });
                        setRequestForm(prev => ({ ...prev, amount: '' }));
                       }}
                       className="flex-1 h-10 sm:h-12 bg-white text-slate-950 hover:bg-slate-200 rounded-xl font-bold uppercase tracking-widest text-[9px] sm:text-[10px]"
                     >
                       Refill
                     </Button>
                     <Button 
                       onClick={() => {
                        setRequestDialog({ open: true, type: 'withdraw' });
                        setRequestForm(prev => ({ ...prev, amount: '' }));
                       }}
                       className="flex-1 h-10 sm:h-12 bg-slate-800 text-white hover:bg-slate-700 rounded-xl font-bold uppercase tracking-widest text-[9px] sm:text-[10px]"
                     >
                       Withdraw
                     </Button>
                   </div>
                </div>
             </div>
          </motion.div>
        </div>

        <div className="space-y-6">
           <div className="p-6 sm:p-8 bg-blue-600 border border-blue-500 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden group shadow-2xl shadow-blue-600/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-16 -translate-y-16" />
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center justify-between">
                    <History className="w-5 h-5 sm:w-6 sm:h-6 text-white/50" />
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
                 </div>
                 <h4 className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Total Wallet Flow</h4>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-white/60 text-[10px] sm:text-xs font-bold tracking-tight">Total Credit (+)</span>
                       <span className="text-base sm:text-lg font-black text-white">+{operator?.balanceType || '₫'}{flow.credit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                       <span className="text-white/60 text-[10px] sm:text-xs font-bold tracking-tight">Total Debit (-)</span>
                       <span className="text-base sm:text-lg font-black text-white">-{operator?.balanceType || '₫'}{flow.debit.toLocaleString()}</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="p-6 sm:p-8 bg-[#161b22] border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] text-center">
              <CreditCard className="w-8 h-8 sm:w-10 sm:h-10 text-slate-700 mx-auto mb-4" />
              <h5 className="text-xs sm:text-sm font-bold text-white mb-2 tracking-tight">Security Check</h5>
              <p className="text-[9px] sm:text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-widest px-4 italic underline decoration-blue-500/30">Regular audits performed by System.</p>
           </div>
        </div>
      </div>

      {/* Ledger History */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl font-bold font-display tracking-tight flex items-center gap-3">
             <TrendingUp className="w-5 h-5 text-blue-500" />
             Wallet Ledger
          </h3>
          <div className="flex gap-2">
             <Button 
               onClick={() => setFilterType(filterType === 'debit' ? 'all' : 'debit')}
               variant={filterType === 'debit' ? 'blue' : 'dark'} 
               className={cn(
                 "h-9 px-4 text-[9px] font-black border rounded-xl uppercase tracking-widest flex-1 sm:flex-none transition-all",
                 filterType === 'debit' ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-white/5"
               )}
             >
                Debit
             </Button>
             <Button 
               onClick={() => setFilterType(filterType === 'credit' ? 'all' : 'credit')}
               variant={filterType === 'credit' ? 'blue' : 'dark'} 
               className={cn(
                 "h-9 px-4 text-[9px] font-black border rounded-xl uppercase tracking-widest flex-1 sm:flex-none transition-all",
                 filterType === 'credit' ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-white/5"
               )}
             >
                Credit
             </Button>
          </div>
        </div>

        <div className="bg-[#161b22] border border-white/5 rounded-[2rem] overflow-hidden shadow-xl">
           <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left min-w-[800px]">
                 <thead>
                   <tr className="border-b border-white/5">
                      <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date & Time</th>
                      <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Type</th>
                      <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Amount</th>
                      <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Reason / Order</th>
                      <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Proof</th>
                      <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Balance</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 font-medium text-xs sm:text-sm">
                    {filteredTransactions.map((tx, idx) => {
                      const txDate = tx.created_at?.toDate ? tx.created_at.toDate() : new Date(tx.created_at);
                      const isValidDate = !isNaN(txDate.getTime());
                      
                      return (
                       <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                             <span className="font-bold text-slate-400">
                               {isValidDate ? txDate.toLocaleString() : 'Processing...'}
                             </span>
                          </td>
                         <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider inline-block",
                              tx.type === 'credit' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                            )}>
                               {tx.type}
                            </span>
                         </td>
                         <td className="px-6 py-4 font-black">
                            <span className={cn(
                              tx.type === 'credit' ? "text-green-500" : "text-red-500"
                            )}>
                               {tx.type === 'credit' ? '+' : '-'}{operator?.balanceType === 'BDT' ? '৳' : operator?.balanceType === 'USDT' ? '$' : '₫'}{Number(tx.amount || 0).toLocaleString()}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <div 
                                className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => { setSelectedTx(tx); setIsDetailOpen(true); }}
                             >
                               <span className="text-slate-200 font-bold truncate max-w-[120px]">{tx.reason}</span>
                               <span className="text-[9px] font-bold text-blue-500 mt-0.5">#{String(tx.order_id || tx.id || '').slice(0, 8)}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-center">
                            {(tx.proof_url || tx.metadata?.proof_url) ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 text-slate-500 hover:text-blue-500 rounded-full"
                                onClick={() => { setViewerSrc(tx.proof_url || tx.metadata?.proof_url); setIsViewerOpen(true); }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            ) : (
                              <span className="text-[10px] text-slate-600 italic">None</span>
                            )}
                         </td>
                         <td className="px-6 py-4 text-right">
                             <span className="font-black text-white">{operator?.balanceType === 'BDT' ? '৳' : operator?.balanceType === 'USDT' ? '$' : '₫'}{(tx.balance_after || 0).toLocaleString()}</span>
                         </td>
                      </tr>
                      );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      <Dialog open={requestDialog.open} onOpenChange={(open) => {
        if (!isSubmitting) {
          setRequestDialog(prev => ({ ...prev, open }));
          setStep(1);
          setProofFile(null);
          setPassword('');
          setRequestForm({
            amount: '',
            country: 'Bangladesh',
            balanceType: 'VND',
            accountType: 'Bkash',
            withdrawalAccountName: '',
            withdrawalAccountNumber: '',
            tx_id: ''
          });
        }
      }}>
        <DialogContent className="max-w-md bg-[#0d1117] border-white/5 text-white p-0 overflow-hidden rounded-[2.5rem]">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  requestDialog.type === 'refill' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {requestDialog.type === 'refill' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold capitalize">{requestDialog.type} Balance</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Step {step} of {requestDialog.type === 'refill' ? '3' : '2'}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setRequestDialog(prev => ({ ...prev, open: false }))}
                className="text-slate-500 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Country</Label>
                    <select 
                      value={requestForm.country}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full h-12 bg-white/5 border-white/10 px-4 rounded-xl text-xs font-bold appearance-none transition-all focus:ring-blue-500"
                    >
                      <option value="Bangladesh">Bangladesh</option>
                      <option value="Vietnam">Vietnam</option>
                      <option value="India">India</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Wallet Type</Label>
                    <select 
                      value={requestForm.balanceType}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, balanceType: e.target.value }))}
                      className="w-full h-12 bg-white/5 border-white/10 px-4 rounded-xl text-xs font-bold appearance-none transition-all focus:ring-blue-500"
                    >
                      <option value="VND">VND Wallet</option>
                      <option value="BDT">BDT Wallet</option>
                      <option value="USDT">USDT Wallet</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Amount ({requestForm.balanceType})</Label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={requestForm.amount}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl text-xl font-display font-bold text-white px-6 transition-all focus:border-blue-500"
                  />
                </div>

                {requestDialog.type === 'withdraw' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account Holder</Label>
                        <Input 
                          value={requestForm.withdrawalAccountName}
                          onChange={(e) => setRequestForm(prev => ({ ...prev, withdrawalAccountName: e.target.value }))}
                          className="h-12 bg-white/5 border-white/10 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account No</Label>
                        <Input 
                          value={requestForm.withdrawalAccountNumber}
                          onChange={(e) => setRequestForm(prev => ({ ...prev, withdrawalAccountNumber: e.target.value }))}
                          className="h-12 bg-white/5 border-white/10 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => setStep(2)}
                  disabled={!requestForm.amount || Number(requestForm.amount) <= 0}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest"
                >
                  Continue to Step 2
                </Button>
              </div>
            )}

            {/* STEP 2: Payment Info / Bank Detail */}
            {step === 2 && (
              <div className="p-0 space-y-6">
                {requestDialog.type === 'refill' ? (
                  <div className="space-y-4 px-8">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Send funds to Admin</Label>
                    <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4 shadow-inner">
                      {adminBankSettings ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                             <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/10">
                                <CreditCard className="w-6 h-6 text-amber-500" />
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Primary Refill Bank</p>
                                <h4 className="text-sm font-black text-white mt-1 capitalize tracking-tight">{adminBankSettings.bankName}</h4>
                             </div>
                          </div>
                          
                          <div className="space-y-3">
                             <div className="flex justify-between items-center group cursor-pointer" onClick={() => { navigator.clipboard.writeText(adminBankSettings.accountNumber); toast.success('Account number copied'); }}>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] italic">Account No</span>
                                <span className="text-sm font-black text-blue-500 tracking-wider group-hover:underline">{adminBankSettings.accountNumber}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] italic">Holder Name</span>
                                <span className="text-xs font-bold text-white uppercase italic">{adminBankSettings.accountHolder}</span>
                             </div>
                             {adminBankSettings.instructions && (
                               <p className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-400 font-bold italic leading-relaxed">
                                  Note: {adminBankSettings.instructions}
                               </p>
                             )}
                          </div>
                        </div>
                      ) : adminBanks.length > 0 ? (
                        <div className="space-y-4">
                          <img src={adminBanks[0].qrCode || adminBanks[0].photo} className="w-full aspect-video object-contain bg-black/40 rounded-2xl" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 capitalize">{adminBanks[0].bankName}</p>
                            <p className="text-sm font-black text-white">{adminBanks[0].accountNumber}</p>
                            <p className="text-[10px] text-slate-500 italic">Holder: {adminBanks[0].accountHolder}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic p-4 text-center">No admin account information available.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Upload Photo & Confirm</Label>
                    <div className="space-y-4">
                      <div className="relative aspect-video rounded-3xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all">
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        />
                        {proofFile ? (
                          <img src={URL.createObjectURL(proofFile)} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                             <Camera className="w-8 h-8 text-slate-600" />
                             <p className="text-[10px] font-bold text-slate-500 uppercase">Upload Withdrawal Method Photo</p>
                          </div>
                        )}
                      </div>
                      <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-bold">Withdraw Amount</span>
                          <span className="text-white font-black">{Number(requestForm.amount).toLocaleString()} {requestForm.balanceType}</span>
                        </div>
                        <Input 
                          type="password"
                          placeholder="Enter login password to confirm"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-12 bg-black/40 border-white/10 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-12 bg-white/5 font-bold">Back</Button>
                  <Button 
                    onClick={() => requestDialog.type === 'refill' ? setStep(3) : handleFinalSubmit()}
                    disabled={requestDialog.type === 'withdraw' && !password}
                    className={cn(
                      "flex-[2] h-12 font-black uppercase tracking-widest",
                      requestDialog.type === 'withdraw' ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"
                    )}
                  >
                    {requestDialog.type === 'refill' ? 'Next: Upload Proof' : 'Confirm Withdrawal'}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3 (Refill Only): Upload Proof */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Transaction Proof</Label>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="relative aspect-video rounded-3xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                      {proofFile ? (
                        <img src={URL.createObjectURL(proofFile)} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                           <Camera className="w-8 h-8 text-slate-600" />
                           <p className="text-[10px] font-bold text-slate-500 uppercase">Upload Payment Screenshot</p>
                        </div>
                      )}
                    </div>
                    <Input 
                      placeholder="Transaction ID (Optional)"
                      className="h-12 bg-white/5 border-white/10 rounded-xl"
                      value={requestForm.tx_id || ''}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, tx_id: e.target.value }))}
                    />
                    <Input 
                      type="password"
                      placeholder="Confirm with Password"
                      className="h-12 bg-white/5 border-white/10 rounded-xl"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 h-12 bg-white/5 font-bold">Back</Button>
                  <Button 
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || !proofFile || !password}
                    className="flex-[2] h-12 bg-green-600 hover:bg-green-500 font-black uppercase tracking-widest"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <ImageViewer 
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        src={viewerSrc || ''}
      />

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md bg-[#0d1117] border-white/5 text-white p-0 overflow-hidden rounded-[2.5rem]">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-black uppercase italic tracking-widest text-blue-500">Transaction Details</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsDetailOpen(false)} className="rounded-full bg-white/5">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-4">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Type</p>
                     <p className={cn(
                       "text-xs font-black uppercase tracking-widest italic",
                       selectedTx?.type === 'credit' ? "text-green-500" : "text-red-500"
                     )}>{selectedTx?.type}</p>
                   </div>
                   <div className="space-y-4">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Amount</p>
                     <p className="text-sm font-black text-white italic">{operator?.balanceType === 'BDT' ? '৳' : operator?.balanceType === 'USDT' ? '$' : '₫'}{Number(selectedTx?.amount || 0).toLocaleString()}</p>
                   </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Reason / Info</p>
                <p className="text-xs font-bold text-slate-200 leading-relaxed italic">{selectedTx?.reason}</p>
              </div>

              {selectedTx?.metadata && (
                <div className="p-6 bg-blue-600/5 border border-blue-600/10 rounded-2xl space-y-4">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 italic border-b border-blue-500/10 pb-2">Full Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedTx.metadata).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic capitalize">{key.replace('_', ' ')}</p>
                        <p className="text-[11px] font-bold text-white truncate italic">{String(value || 'N/A')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const proof = selectedTx?.proof_url || selectedTx?.metadata?.proof_url;
                if (!proof) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Payment Proof</p>
                    <div 
                      className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 cursor-pointer group"
                      onClick={() => { setViewerSrc(proof); setIsViewerOpen(true); }}
                    >
                      <img src={proof} alt="Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-between items-center px-2 py-1">
                <span className="text-[10px] font-bold text-slate-600 italic uppercase">Transaction Time</span>
                <span className="text-[10px] font-black text-slate-400 italic">{selectedTx?.created_at && new Date(selectedTx.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
