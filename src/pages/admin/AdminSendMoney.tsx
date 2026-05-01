import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  Send, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  ArrowRight,
  User,
  Building2,
  FileText
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminSendMoney() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubTX = firebaseService.subscribeToCollection('transactions', [], (data) => {
      setRequests(data.filter(tx => tx.type === 'send'));
    });
    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => setUsers(data));

    setLoading(false);
    return () => {
      unsubTX();
      unsubUsers();
    };
  }, []);

  const handleConfirmPayment = async (tx: any) => {
    const proofUrl = prompt(t('enter_proof_url'), 'https://picsum.photos/seed/proof/800/600');
    if (!proofUrl) return;

    try {
      await firebaseService.updateDocument('transactions', tx.id, { 
        status: 'completed', 
        adminProof: proofUrl,
        updatedAt: new Date().toISOString() 
      });

      // Create notification for user
      await firebaseService.addDocument('notifications', {
        uid: tx.uid,
        title: 'Transfer Completed',
        message: `Your transfer of ${tx.amount} ${tx.currency} to ${tx.receiverInfo?.name} has been completed.`,
        type: 'transaction',
        txId: tx.id,
        read: false,
        createdAt: new Date().toISOString()
      });

      toast.success('Payment confirmed and proof uploaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to confirm payment');
    }
  };

  const handleReject = async (tx: any) => {
    const reason = prompt('Enter rejection reason:', 'Invalid payment proof');
    if (!reason) return;

    try {
      await firebaseService.updateDocument('transactions', tx.id, { 
        status: 'failed', 
        rejectionReason: reason,
        updatedAt: new Date().toISOString() 
      });

      // Create notification for user
      await firebaseService.addDocument('notifications', {
        uid: tx.uid,
        title: 'Transfer Rejected',
        message: `Your transfer request was rejected. Reason: ${reason}`,
        type: 'transaction',
        txId: tx.id,
        read: false,
        createdAt: new Date().toISOString()
      });

      toast.success('Transfer rejected');
    } catch (error) {
      console.error(error);
      toast.error('Failed to reject');
    }
  };

  const filteredRequests = requests.filter(req => {
    const sender = users.find(u => u.uid === req.uid);
    return sender?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           req.receiverInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('p2p_send_control')}</h1>
          <p className="text-slate-400 mt-1">{t('manage_p2p_desc')}</p>
        </div>
      </div>

      <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-display font-bold">{t('pending_transfers')}</h3>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder={t('search_sender_receiver')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 bg-white/5 border-white/10 w-full md:w-80 h-11 rounded-2xl" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-8 py-5">{t('sender')}</th>
                <th className="px-8 py-5">{t('receiver_details')}</th>
                <th className="px-8 py-5">{t('amount')}</th>
                <th className="px-8 py-5">{t('status')}</th>
                <th className="px-8 py-5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredRequests.map((tx) => {
                  const sender = users.find(u => u.uid === tx.uid);
                  return (
                    <motion.tr 
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center font-bold text-blue-500">
                            {sender?.displayName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{sender?.displayName || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-500">{sender?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-slate-500" />
                            <p className="font-bold text-sm">{tx.receiverInfo?.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <p className="text-xs text-slate-400">{tx.receiverInfo?.bankName} • {tx.receiverInfo?.accountNumber}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-slate-500" />
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{tx.receiverInfo?.country} • {tx.receiverInfo?.currency}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-display font-bold text-lg">₫{tx.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">≈ {tx.targetAmount?.toLocaleString()} {tx.targetCurrency}</p>
                      </td>
                      <td className="px-8 py-6">
                        <Badge className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                          tx.status === 'completed' ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                          tx.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                          "bg-red-500/10 text-red-500 border border-red-500/20"
                        )}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {tx.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              className="bg-red-600 hover:bg-red-500 h-9 px-4 rounded-xl"
                              onClick={() => handleConfirmPayment(tx)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {t('confirm_payment')}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 px-4 rounded-xl"
                              onClick={() => handleReject(tx)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              {t('reject')}
                            </Button>
                          </div>
                        ) : tx.adminProof ? (
                          <a 
                            href={tx.adminProof} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400 text-xs font-bold transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {t('proof_sent')}
                          </a>
                        ) : (
                          <span className="text-slate-600 text-xs italic">{t('processed')}</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
