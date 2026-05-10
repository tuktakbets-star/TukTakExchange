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
  Eye,
  Trash2
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
            status: 'waiting_confirmation', 
            paidAt: new Date().toISOString(),
            paid_at: new Date().toISOString(),
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
          
          // 1. Finalize Balance Deduction (Move from pendingLocked to real deduction)
          const amount = tx.amount || 0;
          const totalToDeduct = tx.total_to_deduct || tx.totalToDeduct || amount;
          await firebaseService.updateWalletBalance(tx.uid, tx.currency, -totalToDeduct, -totalToDeduct);

          // 2. CRITICAL: Update sub-admin balance if assigned
          if (tx.assignedSubAdminId || tx.assigned_sub_admin_id) {
            const saId = tx.assignedSubAdminId || tx.assigned_sub_admin_id;
            const { data: subAdmin } = await firebaseService.getDocument('sub_admins', saId);
            if (subAdmin) {
              const currentBalance = subAdmin.walletBalance || subAdmin.wallet_balance || subAdmin.vndBalance || subAdmin.vnd_balance || 0;
              const newSaBalance = currentBalance + totalToDeduct;
              
              await firebaseService.updateDocument('sub_admins', saId, {
                walletBalance: newSaBalance,
                wallet_balance: newSaBalance,
                updatedAt: new Date().toISOString()
              });
              
              await firebaseService.addDocument('sub_admin_wallet_transactions', {
                subAdminId: saId,
                sub_admin_id: saId,
                type: 'credit',
                amount: totalToDeduct,
                reason: `Withdrawal #${tx.id} completed by admin`,
                orderId: tx.id,
                balanceAfter: newSaBalance,
                createdAt: new Date().toISOString()
              });
            }
          }

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
          const amount = tx.amount || 0;
          const totalToDeduct = tx.total_to_deduct || tx.totalToDeduct || amount;

          // 1. Refund Locked Balance
          await firebaseService.updateWalletBalance(tx.uid, tx.currency, 0, -totalToDeduct);

          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'failed', 
            rejectionReason: reason,
            updatedAt: new Date().toISOString() 
          });

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

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction record? This only removes the record from the history, it does not refund balance.')) return;
    try {
      await firebaseService.deleteDocument('transactions', txId);
      toast.success('Transaction record deleted');
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
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

        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
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
                        {(() => {
                           const info = (tx.bankInfo && (tx.bankInfo.bankName || tx.bankInfo.accountNumber || tx.bankInfo.accountName)) ? tx.bankInfo : 
                                        (tx.receiverInfo && (tx.receiverInfo.name || tx.receiverInfo.bankName || tx.receiverInfo.accountNumber)) ? tx.receiverInfo :
                                        (tx.bank_info && (tx.bank_info.bank_name || tx.bank_info.account_number || tx.bank_info.account_name)) ? tx.bank_info :
                                        (tx.receiver_info && (tx.receiver_info.name || tx.receiver_info.bank_name || tx.receiver_info.account_number)) ? tx.receiver_info :
                                        tx;
                                        
                           const bankName = info.bankName || info.bank_name || info.method || info.accountType || tx.account_type || tx.accountType || 'N/A';
                           const accountNumber = info.accountNumber || info.account_number || info.number || info.account || info.withdrawal_account_number || 'N/A';
                           const accountName = info.name || info.accountName || info.withdrawal_account_name || info.account_name || 'N/A';

                           return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                <p className="font-bold text-sm">{bankName}</p>
                              </div>
                              <p className="text-xs text-slate-400">{accountNumber}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{accountName}</p>
                            </div>
                           );
                        })()}
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
                        (tx.status === 'pending' || tx.status === 'accepted') ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                        (tx.status === 'waiting_confirmation' || tx.status === 'paid' || tx.status === 'mark_as_paid') ? "bg-purple-500/10 text-purple-500 border border-purple-500/20" :
                        "bg-red-500/10 text-red-500 border border-red-500/20"
                      )}>
                        {tx.status === 'waiting_confirmation' ? 'Waiting User' : tx.status}
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
                          {(tx.status === 'waiting_confirmation' || tx.status === 'paid' || tx.status === 'mark_as_paid') && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-500 h-9 px-4 rounded-xl font-bold"
                              onClick={() => handleConfirmPayment(tx)}
                            >
                              Complete
                            </Button>
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
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-slate-500 hover:text-red-500 hover:bg-red-500/10 h-9 w-9 rounded-xl"
                            onClick={() => handleDeleteTransaction(tx.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden p-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredRequests.map((tx) => {
              const user = users.find(u => u.uid === tx.uid);
              return (
                <motion.div 
                  key={tx.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center font-bold text-orange-500">
                        {user?.displayName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{user?.displayName || t('unknown')}</p>
                        <p className="text-[10px] text-slate-500 tracking-tighter">{tx.id.slice(0,8)}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                      tx.status === 'completed' ? "bg-green-500/10 text-green-500" :
                      (tx.status === 'pending' || tx.status === 'accepted') ? "bg-yellow-500/10 text-yellow-500" :
                      (tx.status === 'waiting_confirmation' || tx.status === 'paid' || tx.status === 'mark_as_paid') ? "bg-purple-500/10 text-purple-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {tx.status === 'waiting_confirmation' ? 'Waiting User' : tx.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Amount</p>
                      <p className="text-lg font-bold">₫{tx.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Bank</p>
                      {(() => {
                         const info = (tx.bankInfo && (tx.bankInfo.bankName || tx.bankInfo.accountNumber || tx.bankInfo.accountName)) ? tx.bankInfo : 
                                      (tx.receiverInfo && (tx.receiverInfo.name || tx.receiverInfo.bankName || tx.receiverInfo.accountNumber)) ? tx.receiverInfo :
                                      (tx.bank_info && (tx.bank_info.bank_name || tx.bank_info.account_number || tx.bank_info.account_name)) ? tx.bank_info :
                                      (tx.receiver_info && (tx.receiver_info.name || tx.receiver_info.bank_name || tx.receiver_info.account_number)) ? tx.receiver_info :
                                      tx;
                                      
                         const bankName = info.bankName || info.bank_name || info.method || info.accountType || tx.account_type || tx.accountType || 'N/A';
                         const accountNumber = info.accountNumber || info.account_number || info.number || info.account || info.withdrawal_account_number || 'N/A';
                         const accountName = info.name || info.accountName || info.withdrawal_account_name || info.account_name || 'N/A';

                         return (
                           <>
                             <p className="text-xs font-bold leading-tight">{bankName}</p>
                             <p className="text-[9px] text-slate-400 font-mono mt-1">{accountNumber}</p>
                             <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter">{accountName}</p>
                           </>
                         );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-400 text-[10px] uppercase font-bold tracking-widest"
                      onClick={() => {
                        setSelectedTx(tx);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    {tx.bankInfo?.qrCode && (
                       <a href={tx.bankInfo.qrCode} target="_blank" rel="noreferrer" className="text-red-500 font-bold text-[10px] uppercase flex items-center">
                         <QrCode className="w-4 h-4 mr-1" /> QR CODE
                       </a>
                    )}
                  </div>

                  <div className="pt-2 flex gap-2">
                    {tx.status === 'pending' && (
                      <>
                        <Button 
                          className="flex-1 bg-blue-600 hover:bg-blue-500 h-11 rounded-2xl text-xs font-bold"
                          onClick={() => handleAccept(tx)}
                        >
                          Accept
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="flex-1 text-red-400 bg-red-500/5 hover:bg-red-500/10 h-11 rounded-2xl text-xs font-bold"
                          onClick={() => handleReject(tx)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {tx.status === 'accepted' && (
                       <Button 
                          className="w-full bg-purple-600 hover:bg-purple-500 h-11 rounded-2xl text-xs font-bold"
                          onClick={() => handlePaid(tx)}
                        >
                          Mark as Paid
                        </Button>
                    )}
                    {tx.status === 'paid' && (
                      <div className="w-full h-11 flex items-center justify-center bg-blue-500/5 rounded-2xl border border-blue-500/20 font-bold text-[10px] text-blue-400 uppercase">
                        Waiting for User Confirmation
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
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
