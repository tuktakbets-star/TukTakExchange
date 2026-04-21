import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  RefreshCw, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Building2,
  User,
  QrCode,
  ArrowRight,
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
import { motion, AnimatePresence } from 'motion/react';

export default function AdminExchange() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  useEffect(() => {
    const unsubTX = firebaseService.subscribeToCollection('transactions', [], (data) => {
      setRequests(data.filter(tx => tx.type === 'exchange'));
    });
    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => setUsers(data));

    setLoading(false);
    return () => {
      unsubTX();
      unsubUsers();
    };
  }, []);

  const handleAcceptOrder = async (tx: any) => {
    try {
      await firebaseService.updateDocument('transactions', tx.id, { 
        status: 'accepted',
        updatedAt: new Date().toISOString() 
      });
      toast.success('Order received. User will be notified.');
    } catch (error) {
      toast.error('Failed to accept order');
    }
  };

  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleConfirmPaid = async (tx: any) => {
    setConfirmConfig({
      title: 'Confirm Payment',
      description: 'Are you sure you have sent the funds to the receiver? This will notify the user to confirm receipt. You can upload a receipt below.',
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
            title: 'Payment Sent',
            message: `Admin has sent ${tx.targetAmount} ${tx.targetCurrency} to your receiver. Please check and confirm receipt.`,
            type: 'transaction',
            txId: tx.id,
            read: false,
            createdAt: new Date().toISOString()
          });

          toast.success('User notified about payment');
        } catch (error) {
          toast.error('Operation failed');
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const handleReject = async (tx: any) => {
    setConfirmConfig({
      title: 'Reject Exchange',
      description: 'Are you sure you want to reject this exchange request? The funds will be refunded to the user.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          // 1. Refund Locked Balance
          await firebaseService.updateWalletBalance(tx.uid, tx.currency, 0, -(tx.totalToDeduct || tx.amount));

          // 2. Update status
          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'rejected', 
            updatedAt: new Date().toISOString() 
          });

          await firebaseService.addDocument('notifications', {
            uid: tx.uid,
            title: 'Exchange Rejected',
            message: `Your exchange request for ${tx.amount} ${tx.currency} has been rejected and refunded.`,
            type: 'transaction',
            txId: tx.id,
            read: false,
            createdAt: new Date().toISOString()
          });

          toast.success('Rejected and Refunded');
        } catch (error) {
          toast.error('Operation failed');
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const filteredRequests = requests.filter(req => {
    const user = users.find(u => u.uid === req.uid);
    return user?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           req.receiverInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Exchange Requests</h1>
          <p className="text-slate-400 mt-1">Manage currency exchanges and payments</p>
        </div>
      </div>

      <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-display font-bold">All Exchanges</h3>
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
                <th className="px-8 py-5">User</th>
                <th className="px-8 py-5">Amount</th>
                <th className="px-8 py-5">Receiver Details</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
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
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center font-bold text-blue-500">
                            {user?.displayName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{user?.displayName || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-500">{user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{tx.amount.toLocaleString()} {tx.currency}</p>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <p className="font-bold text-brand-blue">{tx.targetAmount} {tx.targetCurrency}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="font-bold text-sm">{tx.receiverInfo?.name}</p>
                          <p className="text-xs text-slate-400">{tx.receiverInfo?.bankName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{tx.receiverInfo?.accountNumber}</p>
                          {tx.receiverInfo?.qrCode && (
                            <button 
                              onClick={() => {
                                setViewerSrc(tx.receiverInfo.qrCode);
                                setIsViewerOpen(true);
                              }}
                              className="text-blue-500 text-[10px] font-bold hover:underline flex items-center gap-1"
                            >
                              <QrCode className="w-3 h-3" /> View QR
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <Badge className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                          tx.status === 'completed' ? "bg-green-500/10 text-green-500" :
                          tx.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                          tx.status === 'accepted' ? "bg-blue-500/10 text-blue-500" :
                          tx.status === 'paid' ? "bg-indigo-500/10 text-indigo-500" :
                          "bg-red-500/10 text-red-500"
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
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-500 h-9 px-4 rounded-xl"
                              onClick={() => handleAcceptOrder(tx)}
                            >
                              Accept Order
                            </Button>
                          )}
                          {tx.status === 'accepted' && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-500 h-9 px-4 rounded-xl"
                              onClick={() => handleConfirmPaid(tx)}
                            >
                              Mark as Paid
                            </Button>
                          )}
                          {(tx.status === 'pending' || tx.status === 'accepted') && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-400 hover:text-red-300 h-9 px-4 rounded-xl"
                              onClick={() => handleReject(tx)}
                            >
                              Reject
                            </Button>
                          )}
                          {tx.status === 'paid' && (
                            <span className="text-slate-500 text-xs italic">Waiting for User Confirmation</span>
                          )}
                          {tx.status === 'completed' && (
                            <Badge variant="outline" className="text-green-500 border-green-500/20">Completed</Badge>
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
        alt="User QR / Proof"
      />
    </div>
  );
}
