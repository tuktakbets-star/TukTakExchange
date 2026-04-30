import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  User, 
  ExternalLink,
  Clock,
  ArrowUpRight,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  History
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminSubAdminLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const logs = [
    { date: '2026-04-29T13:40:00Z', subAdmin: 'operator_alpha', user: 'Rahat Khan', orderId: 'TX-9821', type: 'Add Money', amount: '৳ 500', action: 'Approved', status: 'approved' },
    { date: '2026-04-29T12:15:00Z', subAdmin: 'operator_alpha', user: 'Nabila H.', orderId: 'WD-1102', type: 'Withdraw', amount: '৳ 1,200', action: 'Marked Paid', status: 'mark_as_paid' },
    { date: '2026-04-29T11:05:00Z', subAdmin: 'karim_op', user: 'Sumon Ahmed', orderId: 'EX-4421', type: 'Exchange', amount: '৳ 2,500', action: 'Marked Paid', status: 'mark_as_paid' },
    { date: '2026-04-28T16:20:00Z', subAdmin: 'operator_alpha', user: 'Zakir Hossain', orderId: 'RC-5523', type: 'Recharge', amount: '৳ 200', action: 'Approved', status: 'approved' },
    { date: '2026-04-28T14:10:00Z', subAdmin: 'sabbir_sub', user: 'Fatima Z.', orderId: 'CI-1123', type: 'Cash In', amount: '৳ 1,000', action: 'Rejected', status: 'rejected' },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-white flex items-center gap-4 group">
            <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
               <History className="w-6 h-6 text-red-500" />
            </div>
            Operator Activity Logs
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Real-time audit tracking for all sub-admin operations.</p>
        </div>
        <Button variant="dark" className="h-11 px-6 rounded-xl font-bold bg-white/5 border-white/5 hover:border-white/10 transition-all font-bold uppercase tracking-widest text-[10px]">
          <Download className="w-4 h-4 mr-2" />
          Export System Audit
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search by Sub Admin, Order ID, User..." 
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
            className="w-full h-12 bg-white/5 border-white/10 pl-12 pr-4 rounded-2xl text-sm font-medium appearance-none focus:ring-red-500 transition-all cursor-pointer"
          >
            <option value="all">All Action Types</option>
            <option value="add_money">Add Money</option>
            <option value="cash_in">Cash In</option>
            <option value="exchange">Exchange</option>
            <option value="withdraw">Withdraw</option>
            <option value="recharge">Recharge</option>
          </select>
        </div>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select className="w-full h-12 bg-white/5 border-white/10 pl-12 pr-4 rounded-2xl text-sm font-medium appearance-none focus:ring-red-500 transition-all cursor-pointer">
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
            <option>Selection Range...</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#161b22] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto min-h-[500px]">
           <table className="w-full text-left font-medium">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sub Admin</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">User Context</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Order ID</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Type</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Amount</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Action</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {logs.map((log, idx) => (
                   <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                         <div className="flex flex-col">
                            <span className="text-xs text-slate-300 font-bold">{new Date(log.date).toLocaleDateString()}</span>
                            <span className="text-[10px] font-bold text-slate-600 mt-1 uppercase">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500 font-black text-xs border border-red-500/20 group-hover:scale-110 transition-transform">
                               {log.subAdmin[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-white tracking-tight italic">@{log.subAdmin}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">{log.user}</span>
                      </td>
                      <td className="px-8 py-6">
                         <button className="text-blue-500 font-bold font-mono text-sm flex items-center gap-2 hover:underline">
                            #{log.orderId}
                            <ExternalLink className="w-3 h-3" />
                         </button>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{log.type}</span>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-lg font-black text-white">{log.amount}</span>
                      </td>
                      <td className="px-8 py-6">
                         <span className={cn(
                            "text-xs font-bold italic",
                            log.action === 'Rejected' ? "text-red-500" : "text-slate-400"
                         )}>{log.action}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                           log.status === 'approved' ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]" :
                           log.status === 'mark_as_paid' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                           "bg-red-500/10 text-red-500 border-red-500/20"
                         )}>
                            {log.status.replace(/_/g, ' ')}
                         </span>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
        
        {/* Pagination */}
        <div className="p-8 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 italic">Showing top 5 system audit entries</span>
            <div className="flex items-center gap-2">
               <Button variant="ghost" className="h-11 w-11 p-0 rounded-xl"><ChevronLeft className="w-5 h-5" /></Button>
               <Button variant="dark" className="h-11 w-11 p-0 rounded-xl bg-red-600 text-white font-black border-0 shadow-lg shadow-red-600/20">1</Button>
               <Button variant="ghost" className="h-11 w-11 p-0 rounded-xl"><ChevronRight className="w-5 h-5" /></Button>
            </div>
        </div>
      </div>
    </div>
  );
}
