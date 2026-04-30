import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Download,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabaseService, where, orderBy, limit } from '@/lib/supabaseService';

export default function OperatorHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalHandled: 0, totalAmount: 0 });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const sessionStr = sessionStorage.getItem('operator_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);

    const constraints = [
      where('assigned_sub_admin_id', '==', session.id),
      orderBy('created_at', 'desc'),
      limit(50)
    ];

    const data = await supabaseService.getCollection('transactions', constraints);
    setHistory(data || []);
    
    // Calculate simple stats
    const totalAmount = (data || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
    setStats({
      totalHandled: data?.length || 0,
      totalAmount
    });
    
    setLoading(false);
  };

  const filteredHistory = history.filter(row => {
    if (typeFilter !== 'all' && row.type !== typeFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        row.id.toLowerCase().includes(search) ||
        (row.userName && row.userName.toLowerCase().includes(search)) ||
        row.amount.toString().includes(search)
      );
    }
    return true;
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
          <h1 className="text-3xl font-display font-black tracking-tight text-white">Action History</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm capitalize">Audit trail of all your activities on the platform.</p>
        </div>
        <Button variant="dark" className="h-11 px-6 rounded-xl font-bold bg-white/5 border-white/5 hover:border-white/10 transition-all">
          <Download className="w-4 h-4 mr-2" />
          Export My Activity
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-8 bg-gradient-to-br from-[#161b22] to-slate-900 border border-white/5 rounded-[2.5rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[80px] rounded-full" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 leading-none">💸 Volume Handled</p>
              <h3 className="text-3xl font-black text-white">৳ {stats.totalAmount.toLocaleString()}</h3>
              <p className="text-xs font-bold text-slate-600 italic">{stats.totalHandled} orders processed</p>
            </div>
            <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center border border-blue-500/20">
               <ArrowUpRight className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-8 bg-gradient-to-br from-[#161b22] to-slate-900 border border-white/5 rounded-[2.5rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[80px] rounded-full" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 leading-none">⏱️ Recent Handled</p>
              <h3 className="text-3xl font-black text-white">{history.filter(h => h.status === 'completed' || h.status === 'approved').length}</h3>
              <p className="text-xs font-bold text-slate-600 italic">Total successful transactions</p>
            </div>
            <div className="w-16 h-16 bg-purple-600/10 rounded-3xl flex items-center justify-center border border-purple-500/20">
               <CheckCircle2 className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search Order ID, user, amount..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 bg-white/5 border-white/10 pl-12 rounded-2xl"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full h-12 bg-white/5 border-white/10 pl-12 pr-4 rounded-2xl text-sm font-medium appearance-none focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="add_money">Add Money</option>
            <option value="cash_in">Cash In</option>
            <option value="exchange">Exchange</option>
            <option value="withdraw">Withdraw</option>
            <option value="recharge">Recharge</option>
          </select>
        </div>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select className="w-full h-12 bg-white/5 border-white/10 pl-12 pr-4 rounded-2xl text-sm font-medium appearance-none focus:ring-blue-500 transition-all cursor-pointer">
            <option>Last 50 Entries</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#161b22] border border-white/5 rounded-[2.5rem] shadow-xl overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
           <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order ID</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {filteredHistory.map((row, idx) => (
                   <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-5">
                         <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-200">{new Date(row.createdAt).toLocaleDateString()}</span>
                            <span className="text-[10px] font-bold text-slate-600 mt-0.5">{new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <span className="text-blue-400 font-bold font-mono text-sm">#{row.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-5">
                         <span className="text-sm font-bold text-slate-300">{row.userName || row.uid.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-5">
                         <span className="text-xs font-bold text-purple-400/80 uppercase tracking-wider">{row.type.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-6 py-5">
                         <span className="text-lg font-black text-white">৳{row.amount}</span>
                      </td>
                      <td className="px-6 py-5">
                         <span className="text-xs font-bold text-slate-400 italic capitalize">{row.subAdminAction || 'No action'}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block border",
                           (row.status === 'approved' || row.status === 'completed') ? "bg-green-500/10 text-green-500 border-green-500/20" :
                           row.status === 'mark_as_paid' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                           row.status === 'accepted' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                           "bg-red-500/10 text-red-500 border-red-500/20"
                         )}>
                            {row.status.replace(/_/g, ' ')}
                         </span>
                      </td>
                   </tr>
                 ))}
                 {filteredHistory.length === 0 && (
                   <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">No history records found.</td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
        
        <div className="p-6 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 italic">Showing {filteredHistory.length} entries</span>
        </div>
      </div>
    </div>
  );
}

import { CheckCircle2 } from 'lucide-react';

