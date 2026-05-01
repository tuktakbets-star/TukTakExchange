import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  ArrowUpRight, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Building2,
  User,
  QrCode,
  Eye
} from 'lucide-react';
import { TransactionDetailsModal } from '@/components/TransactionDetailsModal';
import { ImageViewer } from '@/components/ImageViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminWithdraw() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  useEffect(() => {
    const unsubTX = firebaseService.subscribeToCollection('transactions', [], (data) => {
      setRequests(data.filter(tx => tx.type === 'withdraw'));
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
      toast.success('Withdrawal Accepted');
    } catch (error) {
      toast.error(t('operation_failed'));
    }
  };

  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handlePaid = async (tx: any) => {
    setConfirmConfig({
      title: 'Mark as Paid',
      description: 'Upload a payment receipt to notify the user. They will then be able to confirm receipt or file an appeal.',
      showInput: true,
      onConfirm: async (data: any) => {
        try {
          const proofUrl = data?.proofUrl;
          if (!proofUrl) {
            toast.error('Payment proof is required');
            return;
          }
          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'paid', 
            paidAt: new Date().toISOString(),
            adminProof: proofUrl,
            updatedAt: new Date().toISOString() 
          });

          await firebaseService.addDocument('notifications', {
            uid: tx.uid,
            title: 'Withdrawal Paid',
            message: `Admin has sent ${tx.amount} ${tx.currency} to your bank. Please check your account and confirm receipt.`,
            type: 'transaction',
            txId: tx.id,
            read: false,
            createdAt: new Date().toISOString()
          });

          toast.success('Marked as Paid and receipt uploaded');
        } catch (error) {
          toast.error(t('operation_failed'));
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const handleConfirmPayment = async (tx: any) => {
    setConfirmConfig({
      title: t('confirm_payment'),
      description: t('confirm_payment_msg'),
      showInput: true,
      onConfirm: async (data: any) => {
        try {
          const proofUrl = data?.proofUrl || 'https://picsum.photos/seed/proof/800/600';
          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'completed', 
            adminProof: proofUrl,
            updatedAt: new Date().toISOString() 
          });

          await firebaseService.addDocument('notifications', {
            uid: tx.uid,
            title: 'Withdrawal Completed',
            message: `Your withdrawal of ${tx.amount} ${tx.currency} has been processed.`,
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
      title: t('reject_withdrawal'),
      description: t('reject_withdraw_confirm_msg'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const reason = 'Invalid bank details';
          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'failed', 
            rejectionReason: reason,
            updatedAt: new Date().toISOString() 
          });

          // 1. Refund Locked Balance
          await firebaseService.updateWalletBalance(tx.uid, tx.currency, 0, -tx.amount);

          await firebaseService.addDocument('notifications', {
            uid: tx.uid,
            title: 'Withdrawal Rejected',
            message: `Your withdrawal request was rejected. Reason: ${reason}. Amount has been refunded.`,
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
    const user = users.find(u => u.uid === req.uid);
    return user?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           user?.uid?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('pendingWithdraws')}</h1>
          <p className="text-slate-400 mt-1">{t('realTimeStats')}</p>
        </div>
      </div>

      <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-display font-bold">{t('pendingWithdraws')}</h3>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder={t('search')} 
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
                <th className="px-8 py-5">{t('totalUsers')}</th>
                <th className="px-8 py-5">{t('amount')}</th>
                <th className="px-8 py-5">{t('check_bank')}</th>
                <th className="px-8 py-5">{t('confirmTransfer')}</th>
                <th className="px-8 py-5">{t('status')}</th>
                <th className="px-8 py-5 text-right">{t('quickActions')}</th>
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
                          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center font-bold text-orange-500">
                            {user?.displayName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{user?.displayName || t('unknown')}</p>
                            <p className="text-[10px] text-slate-500">{user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-display font-bold text-lg">₫{tx.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{tx.currency}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <p className="font-bold text-sm">{tx.bankInfo?.bankName}</p>
                          </div>
                          <p className="text-xs text-slate-400">{tx.bankInfo?.accountNumber}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{tx.bankInfo?.accountName}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {tx.bankInfo?.qrCode ? (
                          <a 
                            href={tx.bankInfo.qrCode} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 text-xs font-bold transition-colors"
                          >
                            <QrCode className="w-4 h-4" />
                            {t('qr_code')}
                          </a>
                        ) : (
                          <span className="text-slate-600 text-xs italic">{t('no_proof')}</span>
                        )}
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
                          <Button
                            size="icon"
                            variant="ghost"
                            className="bg-white/5 hover:bg-white/10 text-blue-400 rounded-xl h-9 w-9"
                            onClick={() => {
                              setSelectedTx(tx);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
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
                            <div className="flex flex-col items-end">
                              <span className="text-green-500 text-xs font-bold flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3 h-3" />
                                {t('completed')}
                              </span>
                              {tx.adminProof && (
                                <a 
                                  href={tx.adminProof} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[10px] text-blue-400 hover:underline"
                                >
                                  View Proof
                                </a>
                              )}
                            </div>
                          )}
                          {(tx.status === 'failed' || tx.status === 'rejected' || tx.status === 'cancelled') && (
                            <span className="text-red-500 text-xs italic">
                              {tx.status === 'cancelled' ? 'User Cancelled' : t('failed')}
                            </span>
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
        showInput={confirmConfig?.showInput}
      />

      <TransactionDetailsModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        tx={selectedTx}
        user={users.find(u => u.uid === selectedTx?.uid)}
      />

      <ImageViewer 
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        src={viewerSrc}
        alt="Transaction Proof"
      />
    </div>
  );
}
