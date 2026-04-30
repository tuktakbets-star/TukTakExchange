import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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
  History
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabaseService, where } from '@/lib/supabaseService';

export default function OperatorWallet() {
  const [operator, setOperator] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h1 className="text-3xl font-display font-black tracking-tight text-white font-black">My Operator Wallet</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Monitor your balance and transaction history.</p>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 h-full bg-[#161b22] border border-white/10 rounded-[3rem] relative overflow-hidden group shadow-2xl flex flex-col justify-center"
          >
             <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-purple-600/10 blur-[120px] rounded-full translate-x-32 -translate-y-32 group-hover:scale-125 transition-transform duration-1000" />
             
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                        <Wallet className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Current Working Balance</span>
                   </div>
                   <div className="flex items-baseline gap-2">
                     <span className="text-6xl font-black text-white tracking-tighter shadow-blue-500/20">৳{(operator?.wallet_balance || 0).toLocaleString()}</span>
                   </div>
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Secured by Admin</span>
                   </div>
                </div>

                <div className="md:w-64 space-y-4">
                   <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 text-slate-400">
                      <Info className="w-5 h-5 text-amber-500 shrink-0" />
                      <p className="text-[10px] font-bold leading-tight uppercase italic">Notice: You cannot load balance yourself. Please contact Administrator for wallet refill.</p>
                   </div>
                   <Button className="w-full h-12 bg-white text-slate-950 hover:bg-slate-200 rounded-xl font-bold uppercase tracking-widest text-[10px]">Contact Admin to Load</Button>
                </div>
             </div>
          </motion.div>
        </div>

        <div className="space-y-6">
           <div className="p-8 bg-blue-600 border border-blue-500 rounded-[2.5rem] relative overflow-hidden group shadow-2xl shadow-blue-600/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-16 -translate-y-16" />
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center justify-between">
                    <History className="w-6 h-6 text-white/50" />
                    <TrendingUp className="w-5 h-5 text-white/80" />
                 </div>
                 <h4 className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Today's Wallet Flow</h4>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-white/60 text-xs font-bold font-medium tracking-tight">Total Credit (+)</span>
                       <span className="text-lg font-black text-white">+৳2,400</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                       <span className="text-white/60 text-xs font-bold font-medium tracking-tight">Total Debit (-)</span>
                       <span className="text-lg font-black text-white">-৳1,800</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="p-8 bg-[#161b22] border border-white/5 rounded-[2.5rem] text-center">
              <CreditCard className="w-10 h-10 text-slate-700 mx-auto mb-4" />
              <h5 className="text-sm font-bold text-white mb-2 tracking-tight">Security Check</h5>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-widest px-4 italic">Regular audits are performed on your wallet balance vs order actions.</p>
           </div>
        </div>
      </div>

      {/* Ledger History */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold font-display tracking-tight flex items-center gap-3">
             <TrendingUp className="w-5 h-5 text-blue-500" />
             Wallet Ledger (Transaction History)
          </h3>
          <div className="flex gap-2">
             <Button variant="dark" className="h-10 text-[10px] font-black border border-white/5 rounded-xl uppercase tracking-widest">
                Debit Only
             </Button>
             <Button variant="dark" className="h-10 text-[10px] font-black border border-white/5 rounded-xl uppercase tracking-widest">
                Credit Only
             </Button>
          </div>
        </div>

        <div className="bg-[#161b22] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-xl">
           <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left">
                 <thead>
                   <tr className="border-b border-white/5">
                      <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date & Time</th>
                      <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                      <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason / Order ID</th>
                      <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Balance After</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 font-medium">
                    {transactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-8 py-6">
                            <span className="text-xs text-slate-400 font-bold">{new Date(tx.created_at).toLocaleString()}</span>
                         </td>
                         <td className="px-8 py-6">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block",
                              tx.type === 'credit' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                            )}>
                               {tx.type}
                            </span>
                         </td>
                         <td className="px-8 py-6">
                            <span className={cn(
                              "text-lg font-black",
                              tx.type === 'credit' ? "text-green-500" : "text-red-500"
                            )}>
                               {tx.type === 'credit' ? '+' : '-'}৳{tx.amount}
                            </span>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex flex-col">
                               <span className="text-xs font-bold text-slate-200 tracking-tight">{tx.reason}</span>
                               <span className="text-[10px] font-bold text-blue-500 mt-1">#{tx.order_id}</span>
                            </div>
                         </td>
                         <td className="px-8 py-6 text-right">
                             <span className="text-sm font-black text-white">৳{(tx.balance_after || 0).toLocaleString()}</span>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}
