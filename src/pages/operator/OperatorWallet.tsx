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
  UserCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabaseService, where, orderBy, limit } from '@/lib/supabaseService';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function OperatorWallet() {
  const [operator, setOperator] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialog, setRequestDialog] = useState<{ open: boolean, type: 'refill' | 'withdraw' }>({ open: false, type: 'refill' });
  const [requestForm, setRequestForm] = useState({
    amount: '',
    country: 'Bangladesh',
    balanceType: 'VND',
    accountType: 'Bkash',
    withdrawalAccountName: '',
    withdrawalAccountNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const sessionStr = sessionStorage.getItem('operator_session');
    if (!sessionStr) return;
    
    const session = JSON.parse(sessionStr);
    
    // Fetch operator
    const { data: opData } = await supabaseService.getDocument('sub_admins', session.id);
    if (opData) setOperator(opData);

    // Fetch wallet transactions
    supabaseService.subscribeToCollection('sub_admin_wallet_transactions', [
      where('sub_admin_id', '==', session.id)
    ], (updated) => setTransactions(updated));
    
    setLoading(false);
  };

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
                     <span className="text-3xl sm:text-6xl font-black text-white tracking-tighter shadow-blue-500/20">₫{(operator?.wallet_balance || 0).toLocaleString()}</span>
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
                 <h4 className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Today's Wallet Flow</h4>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-white/60 text-[10px] sm:text-xs font-bold tracking-tight">Total Credit (+)</span>
                       <span className="text-base sm:text-lg font-black text-white">+৳2,400</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                       <span className="text-white/60 text-[10px] sm:text-xs font-bold tracking-tight">Total Debit (-)</span>
                       <span className="text-base sm:text-lg font-black text-white">-৳1,800</span>
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
             <Button variant="dark" className="h-9 px-4 text-[9px] font-black border border-white/5 rounded-xl uppercase tracking-widest flex-1 sm:flex-none">
                Debit
             </Button>
             <Button variant="dark" className="h-9 px-4 text-[9px] font-black border border-white/5 rounded-xl uppercase tracking-widest flex-1 sm:flex-none">
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
                      <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Balance</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 font-medium text-xs sm:text-sm">
                    {transactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-6 py-4">
                            <span className="font-bold text-slate-400">{new Date(tx.created_at).toLocaleString()}</span>
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
                               {tx.type === 'credit' ? '+' : '-'}৳{tx.amount}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-col">
                               <span className="text-slate-200 font-bold truncate max-w-[120px]">{tx.reason}</span>
                               <span className="text-[9px] font-bold text-blue-500 mt-0.5">#{tx.order_id?.slice(0, 8)}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-right">
                             <span className="font-black text-white">৳{(tx.balance_after || 0).toLocaleString()}</span>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      <Dialog open={requestDialog.open} onOpenChange={(open) => !isSubmitting && setRequestDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md bg-[#0d1117] border-white/5 text-white p-0 overflow-hidden rounded-[2.5rem]">
          <div className="p-8 space-y-8">
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
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Submit for Admin Approval</p>
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

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Country</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <select 
                      value={requestForm.country}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full h-12 bg-white/5 border-white/10 pl-10 pr-4 rounded-xl text-xs font-bold appearance-none transition-all focus:ring-blue-500"
                    >
                      <option value="Bangladesh">Bangladesh</option>
                      <option value="Vietnam">Vietnam</option>
                      <option value="India">India</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Balance Type</Label>
                  <div className="relative">
                    <CircleDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <select 
                      value={requestForm.balanceType}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, balanceType: e.target.value }))}
                      className="w-full h-12 bg-white/5 border-white/10 pl-10 pr-4 rounded-xl text-xs font-bold appearance-none transition-all focus:ring-blue-500"
                    >
                      <option value="VND">VND Wallet</option>
                      <option value="BDT">BDT Wallet</option>
                      <option value="USDT">USDT Wallet</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account / Method</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <select 
                    value={requestForm.accountType}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, accountType: e.target.value }))}
                    className="w-full h-12 bg-white/5 border-white/10 pl-10 pr-4 rounded-xl text-xs font-bold appearance-none transition-all focus:ring-blue-500"
                  >
                    <option value="Bkash">Bkash Personal</option>
                    <option value="Nagad">Nagad Personal</option>
                    <option value="Rocket">Rocket Personal</option>
                    <option value="Momo">Momo (VND)</option>
                    <option value="ZaloPay">ZaloPay (VND)</option>
                    <option value="Bank">Direct Bank Transfer</option>
                  </select>
                </div>
              </div>

              {requestDialog.type === 'withdraw' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Holder Name</Label>
                    <Input 
                      placeholder="Account holder..."
                      value={requestForm.withdrawalAccountName}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, withdrawalAccountName: e.target.value }))}
                      className="h-12 bg-white/5 border-white/10 rounded-xl text-xs font-bold px-4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account / Phone No</Label>
                    <Input 
                      placeholder="Account number..."
                      value={requestForm.withdrawalAccountNumber}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, withdrawalAccountNumber: e.target.value }))}
                      className="h-12 bg-white/5 border-white/10 rounded-xl text-xs font-bold px-4"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Amount</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    placeholder="Enter amount..."
                    value={requestForm.amount}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl text-xl font-display font-bold text-white px-6 transition-all focus:border-blue-500"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black text-blue-400">
                    {requestForm.balanceType === 'BDT' ? '৳' : '₫'}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                <div className="flex gap-3">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-slate-500 italic leading-tight">
                    Your request will be sent to the administrator panel for verification. Please wait for the confirmation.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              disabled={isSubmitting || !requestForm.amount || Number(requestForm.amount) <= 0}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  const numAmount = Number(requestForm.amount);
                  if (requestDialog.type === 'withdraw' && numAmount > (operator?.wallet_balance || 0)) {
                    toast.error('Insufficient balance');
                    setIsSubmitting(false);
                    return;
                  }

                  await supabaseService.addDocument('operator_balance_requests', {
                    sub_admin_id: operator.id,
                    username: operator.username,
                    type: requestDialog.type,
                    amount: numAmount,
                    country: requestForm.country,
                    balance_type: requestForm.balanceType,
                    account_type: requestForm.accountType,
                    withdrawal_account_name: requestForm.withdrawalAccountName,
                    withdrawal_account_number: requestForm.withdrawalAccountNumber,
                    status: 'pending',
                    created_at: new Date().toISOString()
                  });
                  
                  toast.success(`${requestDialog.type === 'refill' ? 'Refill' : 'Withdrawal'} request sent successfully!`);
                  setRequestDialog(prev => ({ ...prev, open: false }));
                } catch (e) {
                  toast.error('Failed to send request');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className={cn(
                "w-full h-16 rounded-3xl font-black uppercase tracking-[0.2em] transition-all",
                requestDialog.type === 'refill' 
                  ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20" 
                  : "bg-white text-slate-950 hover:bg-slate-200"
              )}
            >
              {isSubmitting ? 'Processing...' : `Submit ${requestDialog.type} Request`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
