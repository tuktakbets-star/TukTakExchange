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
  Eye,
  Settings2,
  Plus,
  Trash2,
  Save,
  Globe
} from 'lucide-react';
import { TransactionDetailsModal } from '@/components/TransactionDetailsModal';
import { ImageViewer } from '@/components/ImageViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminExchange() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);
  const [isRateSettingsOpen, setIsRateSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubTX = firebaseService.subscribeToCollection('transactions', [], (data) => {
      // Keep existing local status overrides if they are newer?
      // For simplicity, just set data and clear processing state for those IDs
      setRequests(data.filter(tx => tx.type === 'exchange'));
      setIsProcessing(prev => {
        const next = { ...prev };
        data.forEach(d => delete next[d.id]);
        return next;
      });
    });
    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => setUsers(data));
    const unsubRates = firebaseService.subscribeToCollection('rates', [], (data) => {
      console.log('[AdminExchange] Rates Subscription Update:', data);
      // Map tiered_rates to tieredRates if returning from Supabase directly
      const mapped = data.map((r: any) => ({
        ...r,
        // Match both snake_case and camelCase to be safe
        tieredRates: Array.isArray(r.tieredRates) ? r.tieredRates : 
                     (Array.isArray(r.tiered_rates) ? r.tiered_rates : [])
      }));
      setRates(mapped);
    });

    setLoading(false);
    return () => {
      unsubTX();
      unsubUsers();
      unsubRates();
    };
  }, []);

  const handleUpdateTieredRates = async (currency: string, accountType: string, tiers: any[]) => {
    try {
      const normalizedCurrency = currency.toUpperCase();
      const existingRate = rates.find(r => r.target?.toUpperCase() === normalizedCurrency);
      
      const updatedAccountTypes = existingRate?.accountTypes || {};
      updatedAccountTypes[accountType] = { tieredRates: tiers };

      const payload = {
        target: normalizedCurrency,
        accountTypes: updatedAccountTypes,
        updated_at: new Date().toISOString(),
        // Keep tieredRates for backward compatibility (maybe use the first account type's tiers?)
        tiered_rates: tiers, 
        rate: tiers.length > 0 ? tiers[0].rate : 1
      };

      console.log('[AdminExchange] Saving rate payload:', payload);

      if (existingRate?.id) {
        await firebaseService.updateDocument('rates', existingRate.id, payload);
      } else {
        await firebaseService.addDocument('rates', {
          ...payload,
          base: 'VND'
        });
      }
      toast.success(`${accountType} (${normalizedCurrency}) rates updated successfully`);
    } catch (error) {
      console.error('Error updating rates:', error);
      toast.error(`Failed to update ${accountType} rates`);
    }
  };

  const handleAcceptOrder = async (tx: any) => {
    setIsProcessing(prev => ({ ...prev, [tx.id]: true }));
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === tx.id ? { ...r, status: 'accepted' } : r));
    
    try {
      await firebaseService.updateDocument('transactions', tx.id, { 
        status: 'accepted',
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      toast.success('Order received. User will be notified.');
    } catch (error) {
      toast.error('Failed to accept order');
      // Rollback
      setRequests(prev => prev.map(r => r.id === tx.id ? { ...r, status: 'pending' } : r));
    } finally {
      setIsProcessing(prev => {
        const next = { ...prev };
        delete next[tx.id];
        return next;
      });
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
          setIsProcessing(prev => ({ ...prev, [tx.id]: true }));
          // Optimistic update
          setRequests(prev => prev.map(r => r.id === tx.id ? { ...r, status: 'paid', adminProof: proofUrl } : r));

          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'paid', 
            paidAt: new Date().toISOString(),
            paid_at: new Date().toISOString(),
            adminProof: proofUrl,
            updatedAt: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
        } finally {
          setIsProcessing(prev => {
            const next = { ...prev };
            delete next[tx.id];
            return next;
          });
          setIsConfirmOpen(false);
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

          // Optimistic update
          setRequests(prev => prev.map(r => r.id === tx.id ? { ...r, status: 'rejected' } : r));

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

  const handleCompleteOrder = async (tx: any) => {
    setConfirmConfig({
      title: 'Complete Order (Finalize)',
      description: 'Are you sure you want to manually complete this order? This will finalize the balance deduction and mark the task as finished.',
      onConfirm: async () => {
        setIsProcessing(prev => ({ ...prev, [tx.id]: true }));
        try {
          const amountToDeduct = tx.total_to_deduct || tx.totalToDeduct || tx.amount;
          
          // 1. Finalize Balance Deduction (Move from pendingLocked to real deduction)
          await firebaseService.updateWalletBalance(tx.uid, tx.currency, -amountToDeduct, -amountToDeduct);

          // 2. Update status
          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'completed', 
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString() 
          });

          // Optimistic update
          setRequests(prev => prev.map(r => r.id === tx.id ? { ...r, status: 'completed' } : r));

          await firebaseService.addDocument('notifications', {
            uid: tx.uid,
            title: 'Task Completed',
            message: `Admin has finalized your exchange request of ${tx.amount} ${tx.currency}.`,
            type: 'transaction',
            txId: tx.id,
            read: false,
            createdAt: new Date().toISOString()
          });

          toast.success('Order completed successfully');
        } catch (error) {
          console.error(error);
          toast.error('Operation failed');
        } finally {
          setIsProcessing(prev => {
            const next = { ...prev };
            delete next[tx.id];
            return next;
          });
          setIsConfirmOpen(false);
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
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => {
              setLoading(true);
              firebaseService.getCollection('transactions').then(data => {
                setRequests(data.filter(tx => tx.type === 'exchange'));
                setLoading(false);
              });
            }}
            size="icon"
            variant="ghost"
            className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </Button>
          <Button 
            onClick={() => setIsRateSettingsOpen(true)}
            className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl h-12 px-6 font-bold"
          >
            <Settings2 className="w-5 h-5 mr-2 text-brand-blue" />
            Rate Setup
          </Button>
        </div>
      </div>

      {/* Active Rates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {rates.map((rate) => (
          <Card key={rate.id} className="glass-dark border-white/5 p-6 relative group rounded-[2rem]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={async () => {
                if (confirm(`Delete rates for ${rate.target}?`)) {
                  await firebaseService.deleteDocument('rates', rate.id);
                  toast.success(`${rate.target} rates deleted`);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Currency</p>
                  <p className="font-bold text-lg leading-none">{rate.target}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Pricing Rules</p>
                <div className="space-y-2">
                  {(rate.tieredRates || []).slice(0, 3).map((tier: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-slate-400">{tier.min?.toLocaleString()} - {tier.max === 0 || !tier.max ? '∞' : tier.max.toLocaleString()}</span>
                      <span className="font-mono font-bold text-brand-blue">{tier.rate} VND</span>
                    </div>
                  ))}
                  {(rate.tieredRates || []).length > 3 && (
                    <p className="text-[10px] text-slate-600">+ {(rate.tieredRates || []).length - 3} more tiers</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {rates.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/2">
            <Settings2 className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No exchange rates defined yet.</p>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">Use "Rate Setup" to begin</p>
          </div>
        )}
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
                          <p className="font-bold">{tx.amount?.toLocaleString()} {tx.currency}</p>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <p className="font-bold text-brand-blue">{(tx.target_amount || tx.targetAmount)} {(tx.target_currency || tx.targetCurrency)}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="font-bold text-sm">{(tx.receiver_info?.name || tx.receiverInfo?.name)}</p>
                          <p className="text-xs text-slate-400">{(tx.receiver_info?.bankName || tx.receiverInfo?.bankName)}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{(tx.receiver_info?.accountNumber || tx.receiverInfo?.accountNumber)}</p>
                          {(tx.receiver_info?.qrCode || tx.receiverInfo?.qrCode) && (
                            <button 
                              onClick={() => {
                                setViewerSrc(tx.receiver_info?.qrCode || tx.receiverInfo?.qrCode);
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
                          tx.status?.toLowerCase().trim() === 'completed' ? "bg-green-500/10 text-green-500" :
                          tx.status?.toLowerCase().trim() === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                          tx.status?.toLowerCase().trim() === 'accepted' ? "bg-blue-500/10 text-blue-500" :
                          tx.status?.toLowerCase().trim() === 'paid' ? "bg-indigo-500/10 text-indigo-500" :
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
                          {(tx.status?.toLowerCase().trim() === 'pending' || !tx.status || tx.status === '') && (
                            <Button 
                              size="sm" 
                              className="bg-brand-blue hover:bg-blue-500 h-10 px-6 rounded-xl font-bold shadow-lg shadow-blue-500/20"
                              onClick={() => handleAcceptOrder(tx)}
                              disabled={isProcessing[tx.id]}
                            >
                              {isProcessing[tx.id] ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Accept Order'}
                            </Button>
                          )}
                          {(tx.status?.toLowerCase().trim() === 'accepted') && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-500 h-10 px-6 rounded-xl font-bold shadow-lg shadow-green-600/30 animate-pulse"
                              onClick={() => handleConfirmPaid(tx)}
                              disabled={isProcessing[tx.id]}
                            >
                              {isProcessing[tx.id] ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Mark as Paid'}
                            </Button>
                          )}
                          {(tx.status?.toLowerCase().trim() === 'paid' || tx.status?.toLowerCase().trim() === 'disputed') && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-500 h-10 px-6 rounded-xl font-bold shadow-lg shadow-green-600/30"
                              onClick={() => handleCompleteOrder(tx)}
                              disabled={isProcessing[tx.id]}
                            >
                              {isProcessing[tx.id] ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Complete Order'}
                            </Button>
                          )}
                          {(tx.status?.toLowerCase().trim() === 'pending' || tx.status?.toLowerCase().trim() === 'accepted' || tx.status?.toLowerCase().trim() === 'disputed' || !tx.status || tx.status === '') && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 px-6 rounded-xl font-medium"
                              onClick={() => handleReject(tx)}
                            >
                              Reject
                            </Button>
                          )}
                          {tx.status?.toLowerCase().trim() === 'paid' && (
                            <div className="flex items-center gap-2 text-slate-500 ml-2">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">User confirming...</span>
                            </div>
                          )}
                          {tx.status?.toLowerCase().trim() === 'completed' && (
                            <div className="flex items-center gap-1.5 text-green-500">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Done</span>
                            </div>
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

      <RateSettingsModal 
        isOpen={isRateSettingsOpen}
        onClose={() => setIsRateSettingsOpen(false)}
        rates={rates}
        onUpdate={handleUpdateTieredRates}
      />
    </div>
  );
}

function RateSettingsModal({ isOpen, onClose, rates, onUpdate }: { 
  isOpen: boolean, 
  onClose: () => void, 
  rates: any[],
  onUpdate: (currency: string, accountType: string, tiers: any[]) => void
}) {
  const [selectedCurrency, setSelectedCurrency] = useState('BDT');
  const [selectedAccountType, setSelectedAccountType] = useState('');
  const [localTiers, setLocalTiers] = useState<any[]>([]);

  const accountTypesMap: Record<string, string[]> = {
    'BDT': ['bKash', 'Nagad', 'Bank Transfer', 'Rocket', 'upay'],
    'INR': ['UPI', 'IMPS', 'Digital eRupee', 'Paytm'],
    'PKR': ['Easypaisa-PK Only', 'Meezan Bank', 'NayaPay', 'SadaPay'],
    'NPR': ['Esewa', 'Khalti', 'IME Pay']
  };

  useEffect(() => {
    if (isOpen) {
      const types = accountTypesMap[selectedCurrency] || [];
      if (!selectedAccountType || !types.includes(selectedAccountType)) {
        setSelectedAccountType(types[0] || '');
      }

      const rateDoc = rates.find(r => r.target?.toUpperCase() === selectedCurrency.toUpperCase());
      const accountData = rateDoc?.accountTypes?.[selectedAccountType || types[0]];
      
      if (accountData && Array.isArray(accountData.tieredRates)) {
        setLocalTiers(accountData.tieredRates);
      } else if (rateDoc && Array.isArray(rateDoc.tieredRates) && !selectedAccountType) {
        setLocalTiers(rateDoc.tieredRates);
      } else {
        setLocalTiers([{ min: 0, max: 99999999, rate: 200 }]); // Default VND rate
      }
    }
  }, [isOpen, selectedCurrency, selectedAccountType, rates]);

  const addTier = () => {
    setLocalTiers([...localTiers, { min: 0, max: 0, rate: 200 }]);
  };

  const removeTier = (index: number) => {
    setLocalTiers(localTiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: string, value: number) => {
    const newTiers = [...localTiers];
    newTiers[index][field] = value;
    setLocalTiers(newTiers);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/5 text-white max-w-2xl rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold flex items-center gap-3">
            <Globe className="w-6 h-6 text-brand-blue" />
            Rate Management
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Setup VND exchange rates per country based on the sending amount.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-8">
          <div className="flex gap-2 bg-white/5 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {['BDT', 'INR', 'PKR', 'NPR'].map((curr) => (
              <Button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                variant="ghost"
                className={cn(
                  "flex-1 min-w-[80px] rounded-xl h-11 transition-all",
                  selectedCurrency === curr ? "bg-brand-blue text-white shadow-lg" : "text-slate-400 hover:bg-white/5"
                )}
              >
                {curr}
              </Button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm uppercase tracking-widest text-slate-500">Account Type</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {(accountTypesMap[selectedCurrency] || []).map((type) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "rounded-xl border-white/10 h-10 text-[10px] font-bold uppercase",
                    selectedAccountType === type ? "bg-brand-blue text-white border-brand-blue" : "bg-white/5 text-slate-400"
                  )}
                  onClick={() => setSelectedAccountType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm uppercase tracking-widest text-slate-500">Tiered Rates for {selectedAccountType}</h4>
              <Button 
                onClick={addTier}
                size="sm" 
                variant="outline" 
                className="rounded-xl border-white/10 hover:bg-white/5 h-9"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Tier
              </Button>
            </div>

            <div className="space-y-3">
              {localTiers.map((tier, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-end p-4 bg-white/5 rounded-2xl border border-white/5 group">
                  <div className="col-span-4 space-y-1.5">
                    <Label className="text-[10px] text-slate-500 uppercase">Min VND</Label>
                    <Input 
                      type="number"
                      value={tier.min}
                      onChange={(e) => updateTier(idx, 'min', Number(e.target.value))}
                      className="bg-slate-800 border-none h-11 rounded-xl font-bold"
                    />
                  </div>
                  <div className="col-span-4 space-y-1.5">
                    <Label className="text-[10px] text-slate-500 uppercase">Max VND</Label>
                    <Input 
                      type="number"
                      value={tier.max}
                      onChange={(e) => updateTier(idx, 'max', Number(e.target.value))}
                      className="bg-slate-800 border-none h-11 rounded-xl font-bold"
                    />
                  </div>
                  <div className="col-span-3 space-y-1.5">
                    <Label className="text-[10px] text-slate-500 uppercase">Rate (1 {selectedCurrency} = ? VND)</Label>
                    <Input 
                      type="number"
                      step="any"
                      value={tier.rate}
                      onChange={(e) => updateTier(idx, 'rate', Number(e.target.value))}
                      className="bg-slate-800 border-none h-11 rounded-xl font-bold text-blue-400"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button 
                      onClick={() => removeTier(idx)}
                      variant="ghost" 
                      size="icon"
                      className="h-11 w-11 text-red-500 hover:bg-red-500/10 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 mt-4">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 px-6">Cancel</Button>
          <Button 
            onClick={() => {
              onUpdate(selectedCurrency, selectedAccountType, localTiers);
              // Don't close immediately so admin can set other account types
              toast.success(`${selectedAccountType} rates updated`);
            }}
            className="rounded-xl h-12 px-8 bg-brand-blue hover:bg-blue-500 font-bold"
          >
            <Save className="w-4 h-4 mr-2" />
            Save {selectedAccountType}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
