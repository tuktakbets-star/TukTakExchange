import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { motion } from 'motion/react';
import { ShieldCheck, History, Clock, User, ArrowRight, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { orderBy } from 'firebase/firestore';

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const constraints = [orderBy('timestamp', 'desc')];
    const unsubscribe = firebaseService.subscribeToCollection('sub_admin_logs', constraints, (data) => {
      setLogs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <ShieldCheck className="text-indigo-500" />
          Operator Activity Logs
        </h1>
        <p className="text-slate-400 mt-1">Monitor all actions performed by sub-admins/operators.</p>
      </div>

      <div className="bg-slate-900/30 border border-white/5 rounded-[2rem] p-6 lg:p-8 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm">Fetching operational history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mx-auto border border-white/5">
              <History className="w-8 h-8 text-slate-700" />
            </div>
            <p className="text-slate-500">No operator activity recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, idx) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    log.actionType === 'create_user' ? "bg-green-500/10 text-green-500" : "bg-indigo-500/10 text-indigo-500"
                  )}>
                    {log.actionType === 'create_user' ? <User className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Operator: {log.subAdminId.slice(-6)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {log.actionType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="font-bold text-white flex items-center gap-2">
                      {log.actionType === 'create_user' ? 'Created New User' : `Processed ${log.actionType.replace('_', ' ')}`}
                      {log.amount > 0 && <span className="text-indigo-400">{log.amount.toLocaleString()}</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium self-end md:self-center">
                  <div className="bg-slate-900 border border-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <span className="text-slate-500">Order ID:</span>
                    <span className="font-mono text-slate-300">#{log.orderId?.slice(-8) || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 border border-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <span className="text-slate-500">Target:</span>
                    <span className="font-mono text-slate-300">@{log.userId?.slice(-6)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
