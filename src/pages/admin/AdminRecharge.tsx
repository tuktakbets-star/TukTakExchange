import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  Zap, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Smartphone,
  Globe,
  Phone
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminRecharge() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  useEffect(() => {
    const unsubTX = firebaseService.subscribeToCollection('transactions', [], (data) => {
      setRequests(data.filter(tx => tx.type === 'recharge'));
    });
    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => setUsers(data));

    setLoading(false);
    return () => {
      unsubTX();
      unsubUsers();
    };
  }, []);

  const handleAccept = async (tx: any) => {
    try {
      await firebaseService.updateDocument('transactions', tx.id, { 
        status: 'accepted', 
        updatedAt: new Date().toISOString() 
      });
      toast.success('Order Accepted');
    } catch (error) {
      toast.error(t('operation_failed'));
    }
  };

  const handlePaid = async (tx: any) => {
    try {
      await firebaseService.updateDocument('transactions', tx.id, { 
        status: 'paid', 
        updatedAt: new Date().toISOString() 
      });
      toast.success('Marked as Paid');
    } catch (error) {
      toast.error(t('operation_failed'));
    }
  };

  const handleComplete = async (tx: any) => {
    setConfirmConfig({
      title: t('complete_recharge'),
      description: t('complete_recharge_msg'),
      onConfirm: async () => {
        try {
          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'completed', 
            updatedAt: new Date().toISOString() 
          });

          await firebaseService.addDocument('notifications', {
            uid: tx.uid,
            title: 'Recharge Completed',
            message: `Your mobile recharge of ${tx.amount} ${tx.currency} for ${tx.rechargeDetails?.phoneNumber} has been completed.`,
            type: 'transaction',
            txId: tx.id,
            read: false,
            createdAt: new Date().toISOString()
          });

          toast.success(t('completed'));
        } catch (error) {
          toast.error(t('operation_failed'));
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const handleReject = async (tx: any) => {
    setConfirmConfig({
      title: t('reject_recharge'),
      description: t('reject_recharge_confirm_msg'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const reason = 'Invalid phone number or operator';
          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'failed', 
            rejectionReason: reason,
            updatedAt: new Date().toISOString() 
          });

          const walletId = `${tx.uid}_${tx.currency}`;
          const walletDoc = await firebaseService.getDocument('wallets', walletId);
          if (walletDoc) {
            await firebaseService.updateDocument('wallets', walletId, {
              balance: (walletDoc.balance || 0) + tx.amount,
              updatedAt: new Date().toISOString()
            });
          }

          await firebaseService.addDocument('notifications', {
            uid: tx.uid,
            title: 'Recharge Rejected',
            message: `Your recharge request was rejected. Reason: ${reason}. Amount has been refunded.`,
            type: 'transaction',
            txId: tx.id,
            read: false,
            createdAt: new Date().toISOString()
          });

          toast.success(t('completed'));
        } catch (error) {
          toast.error(t('operation_failed'));
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const filteredRequests = requests.filter(req => {
    return req.rechargeDetails?.phoneNumber?.includes(searchQuery) || 
           req.rechargeDetails?.operator?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('recharge_control')}</h1>
          <p className="text-slate-400 mt-1">{t('manage_recharge_desc')}</p>
        </div>
      </div>

      <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-display font-bold">{t('pending_recharges')}</h3>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder={t('search_phone_operator')} 
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
                <th className="px-8 py-5">{t('phone_number')}</th>
                <th className="px-8 py-5">{t('operator_country')}</th>
                <th className="px-8 py-5">{t('amount')}</th>
                <th className="px-8 py-5">{t('user')}</th>
                <th className="px-8 py-5">{t('status')}</th>
                <th className="px-8 py-5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredRequests.map((tx) => {
                  const user = users.find(u => u.uid === tx.uid);
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
                          <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                            <Phone className="w-5 h-5" />
                          </div>
                          <p className="font-display font-bold text-lg">{tx.rechargeDetails?.phoneNumber}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-3 h-3 text-slate-500" />
                            <p className="font-bold text-sm">{tx.rechargeDetails?.operator}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3 text-slate-500" />
                            <p className="text-xs text-slate-400">{tx.rechargeDetails?.country}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-display font-bold text-lg">₫{tx.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{tx.currency}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-medium">{user?.displayName || t('unknown')}</p>
                        <p className="text-[10px] text-slate-500">{user?.email}</p>
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
                        <div className="flex justify-end gap-2">
                          {tx.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-500 h-9 px-4 rounded-xl"
                                onClick={() => handleAccept(tx)}
                              >
                                {t('accept')}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 px-4 rounded-xl"
                                onClick={() => handleReject(tx)}
                              >
                                {t('reject')}
                              </Button>
                            </>
                          )}
                          {tx.status === 'accepted' && (
                            <Button 
                              size="sm" 
                              className="bg-purple-600 hover:bg-purple-500 h-9 px-4 rounded-xl"
                              onClick={() => handlePaid(tx)}
                            >
                              {t('mark_as_paid')}
                            </Button>
                          )}
                          {tx.status === 'paid' && (
                            <span className="text-blue-400 text-xs italic">Waiting for User Confirmation</span>
                          )}
                          {tx.status === 'completed' && (
                            <span className="text-green-500 text-xs font-bold flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3 h-3" />
                              {t('completed')}
                            </span>
                          )}
                          {(tx.status === 'failed' || tx.status === 'rejected' || tx.status === 'cancelled') && (
                            <span className="text-red-500 text-xs italic">{tx.status === 'cancelled' ? 'User Cancelled' : t('failed')}</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmConfig?.onConfirm || (() => {})}
        title={confirmConfig?.title || ''}
        description={confirmConfig?.description || ''}
        variant={confirmConfig?.variant}
      />
    </div>
  );
}
