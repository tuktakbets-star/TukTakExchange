import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  ShieldCheck,
  Zap,
  Info,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseService, where, orderBy, limit } from '@/lib/supabaseService';
import { cn } from '@/lib/utils';

export default function OperatorStatus() {
  const [searchParams] = useSearchParams();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const id = searchParams.get('id');
  const type = searchParams.get('type');

  useEffect(() => {
    if (!id) return;

    const unsub = supabaseService.subscribeToCollection('operator_balance_requests', [
      where('sub_admin_id', '==', id && !isNaN(Number(id)) ? Number(id) : id),
      orderBy('created_at', 'desc'),
      limit(1)
    ], (data) => {
      if (data && data.length > 0) {
        setRequest(data[0]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const isPending = request?.status === 'pending';
  const isApproved = request?.status === 'approved' || request?.status === 'completed';
  const isRejected = request?.status === 'rejected';

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-4 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="p-8 sm:p-12 bg-[#161b22] border border-white/5 rounded-[3rem] shadow-2xl space-y-10 text-center">
          {/* Status Icon */}
          <div className="flex justify-center">
            <div className="relative">
              {isPending && (
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-amber-500/10 rounded-full flex items-center justify-center ring-4 ring-amber-500/20 animate-pulse">
                  <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500 animate-[spin_4s_linear_infinite]" />
                </div>
              )}
              {isApproved && (
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-green-500/10 rounded-full flex items-center justify-center ring-4 ring-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                  <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-green-500" />
                </div>
              )}
              {isRejected && (
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-red-500/10 rounded-full flex items-center justify-center ring-4 ring-red-500/20">
                  <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tighter">
              {isPending ? 'Request Pending' : isApproved ? 'Success!' : 'Request Rejected'}
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] sm:text-xs italic">
              Transaction Ref: <span className="text-blue-500 underline decoration-blue-500/30">#{String(request?.id || '').slice(0, 12)}</span>
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-slate-500 font-bold text-xs">Request Type</span>
              <span className="text-white font-black uppercase italic tracking-widest">{type || request?.type}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-slate-500 font-bold text-xs">Amount</span>
              <span className="text-2xl font-black text-white">{request?.balance_type === 'BDT' ? '৳' : request?.balance_type === 'USDT' ? '$' : '₫'}{Number(request?.amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 capitalize font-bold text-xs">
              <span className="text-slate-500 uppercase tracking-widest text-[9px]">Verified Status</span>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic",
                isPending ? "bg-amber-500/10 text-amber-500 border border-amber-500/10" :
                isApproved ? "bg-green-500/10 text-green-500 border border-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.1)]" :
                "bg-red-500/10 text-red-500 border border-red-500/10"
              )}>
                {request?.status}
              </span>
            </div>
          </div>

          <div className="space-y-4">
             <div className="p-4 bg-blue-600/5 border border-blue-600/10 rounded-2xl flex items-center gap-4 text-left">
                <ShieldCheck className="w-6 h-6 text-blue-500 shrink-0" />
                <div className="space-y-0.5">
                   <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">System Security Audit</h5>
                   <p className="text-[10px] font-bold text-slate-500 leading-snug">All operator requests are audited by the management panel for wallet integrity.</p>
                </div>
             </div>
             
             {isPending && (
                <div className="p-4 bg-slate-500/5 border border-white/5 rounded-2xl flex items-center gap-4 text-left">
                   <Info className="w-6 h-6 text-slate-600 shrink-0" />
                   <p className="text-[10px] font-bold text-slate-500 italic leading-snug">Average processing time: 5-10 minutes. Please keep this page open or check your wallet ledger.</p>
                </div>
             )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link to="/operator/wallet" className="flex-1">
              <Button variant="outline" className="w-full h-14 bg-white/5 hover:bg-white/10 border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Go to Wallet
              </Button>
            </Link>
            <Link to="/operator/dashboard" className="flex-1">
              <Button className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] group">
                Operator Dashboard
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
