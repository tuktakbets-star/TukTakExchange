import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  Wallet, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  Plus,
  QrCode,
  Building2,
  Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea.tsx';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDeposits() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'add_money' | 'cash_in'>('add_money');
  const [addMoneySettings, setAddMoneySettings] = useState<any>(null);
  const [cashInSettings, setCashInSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [localQrFile, setLocalQrFile] = useState<File | null>(null);
  const [localQrPreview, setLocalQrPreview] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  useEffect(() => {
    const unsubTX = firebaseService.subscribeToCollection('transactions', [], (data) => {
      setRequests(data.filter(tx => tx.type === 'deposit' || tx.type === 'cash_in' || tx.type === 'add_money'));
    });
    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => setUsers(data));
    const unsubWallets = firebaseService.subscribeToCollection('wallets', [], (data) => setWallets(data));
    const unsubSettings = firebaseService.subscribeToCollection('adminSettings', [], (data) => {
      const amInfo = data.find(s => s.key === 'add_money_settings');
      const ciInfo = data.find(s => s.key === 'cash_in_settings');
      if (amInfo) setAddMoneySettings(amInfo);
      if (ciInfo) setCashInSettings(ciInfo);
    });

    setLoading(false);
    return () => {
      unsubTX();
      unsubUsers();
      unsubWallets();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    setLocalQrFile(null);
    setLocalQrPreview(null);
  }, [activeTab]);

  const handleUpdateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentSettings = activeTab === 'add_money' ? addMoneySettings : cashInSettings;
    const settingsKey = activeTab === 'add_money' ? 'add_money_settings' : 'cash_in_settings';
    
    // Handle File Upload for QR Code
    let qrUrl = currentSettings?.value?.qrCode || '';
    const qrFile = localQrFile;
    
    try {
      if (qrFile) {
        setIsUploading(true);
        qrUrl = await firebaseService.uploadFile(qrFile);
      }

      const value = {
        qrCode: qrUrl,
        bankName: formData.get('bankName'),
        accountNumber: formData.get('accountNumber'),
        accountHolder: formData.get('accountHolder'),
        instructions: formData.get('instructions'),
        terms: formData.get('terms')
      };

      if (currentSettings) {
        await firebaseService.updateDocument('adminSettings', currentSettings.id, { value, updatedAt: new Date().toISOString() });
      } else {
        await firebaseService.addDocument('adminSettings', { key: settingsKey, value, updatedAt: new Date().toISOString() });
      }
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApprove = async (tx: any) => {
    setConfirmConfig({
      title: t('approve_deposit'),
      description: t('approve_deposit_confirm_msg'),
      onConfirm: async () => {
        try {
          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'completed', 
            updatedAt: new Date().toISOString() 
          });
          
          const walletId = `${tx.uid}_${tx.currency}`;
          const wallet = wallets.find(w => w.id === walletId);
          const currentBalance = wallet?.balance || 0;
          
          await firebaseService.setDocument('wallets', walletId, {
            uid: tx.uid,
            currency: tx.currency,
            balance: currentBalance + tx.amount,
            updatedAt: new Date().toISOString()
          });

          await firebaseService.addDocument('notifications', {
            uid: tx.uid,
            title: 'Deposit Approved',
            message: `Your deposit of ${tx.amount} ${tx.currency} has been approved.`,
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
    // For rejection, we'll just use a simple confirm for now to avoid prompt()
    setConfirmConfig({
      title: t('reject_deposit'),
      description: t('reject_deposit_confirm_msg'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'failed', 
            rejectionReason: 'Invalid payment proof',
            updatedAt: new Date().toISOString() 
          });

          await firebaseService.addDocument('notifications', {
            uid: tx.uid,
            title: 'Deposit Rejected',
            message: `Your deposit request was rejected. Reason: Invalid payment proof`,
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
    const matchesTab = activeTab === 'add_money' ? (req.type === 'deposit' || req.type === 'add_money') : req.type === 'cash_in';
    const matchesSearch = user?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         user?.uid?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const currentSettings = activeTab === 'add_money' ? addMoneySettings : cashInSettings;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Deposit Management</h1>
          <p className="text-slate-400 mt-1">Manage Add Money (Vietnam) and Cash In (Bangladesh) requests.</p>
        </div>

        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('add_money')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'add_money' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-slate-400 hover:text-white"
            )}
          >
            Add Money (VN)
          </button>
          <button
            onClick={() => setActiveTab('cash_in')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'cash_in' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-slate-400 hover:text-white"
            )}
          >
            Cash In (BD)
          </button>
        </div>
      </div>

      {/* Admin Settings Section */}
      <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-600/10 rounded-xl flex items-center justify-center text-red-500">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-display font-bold">
            {activeTab === 'add_money' ? 'Add Money Setup (Vietnam)' : 'Cash In Setup (Bangladesh)'}
          </h3>
        </div>
        
        <form key={`${activeTab}-${currentSettings?.id}`} onSubmit={handleUpdateSettings} className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-slate-500" />
              Scan QR Code Photo
            </Label>
            <div 
              onClick={() => document.getElementById('qr-upload')?.click()}
              className="aspect-square bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-white/10 transition-colors group relative"
            >
              <input 
                id="qr-upload"
                name="qrFile"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLocalQrFile(file);
                    const reader = new FileReader();
                    reader.onload = (re) => {
                      setLocalQrPreview(re.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {localQrPreview || currentSettings?.value?.qrCode ? (
                <img 
                  src={localQrPreview || currentSettings.value.qrCode} 
                  alt="QR Preview" 
                  className="w-full h-full object-contain p-4" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-white transition-colors">
                  <Upload className="w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Upload Photo</span>
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input 
                name="bankName" 
                defaultValue={currentSettings?.value?.bankName}
                placeholder="Bank Name" 
                className="bg-white/5 border-white/10 h-12 rounded-xl" 
              />
            </div>
            <div className="space-y-2">
              <Label>Account Holder</Label>
              <Input 
                name="accountHolder" 
                defaultValue={currentSettings?.value?.accountHolder}
                placeholder="Holder Name" 
                className="bg-white/5 border-white/10 h-12 rounded-xl" 
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Account Number</Label>
              <Input 
                name="accountNumber" 
                defaultValue={currentSettings?.value?.accountNumber}
                placeholder="0123456789" 
                className="bg-white/5 border-white/10 h-12 rounded-xl" 
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                Deposit Instructions
              </Label>
              <Textarea 
                name="instructions" 
                defaultValue={currentSettings?.value?.instructions}
                placeholder="Enter step by step instructions..." 
                className="w-full bg-white/5 border-white/10 rounded-2xl p-4 min-h-[80px] text-sm" 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2 text-red-400">
                <Info className="w-4 h-4" />
                Terms & Conditions
              </Label>
              <Textarea 
                name="terms" 
                defaultValue={currentSettings?.value?.terms}
                placeholder="Enter rules, limits, etc..." 
                className="w-full bg-white/5 border-white/10 rounded-2xl p-4 min-h-[80px] text-sm" 
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <Button type="submit" variant="send" disabled={isUploading} className="w-full h-14 font-bold rounded-2xl">
              {isUploading ? 'Uploading...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Request List Section */}
      <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-display font-bold">
            {activeTab === 'add_money' ? 'Add Money History' : 'Cash In History'}
          </h3>
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
                <th className="px-8 py-5">{t('type')}</th>
                <th className="px-8 py-5">{t('confirmTransfer')}</th>
                <th className="px-8 py-5">{t('date')}</th>
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
                          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-slate-400">
                            {user?.displayName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{user?.displayName || t('unknown')}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{tx.uid.slice(0, 12)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-display font-bold text-lg">₫{tx.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{tx.currency}</p>
                      </td>
                      <td className="px-8 py-6">
                        <Badge variant="outline" className="border-white/10 bg-white/5 capitalize">
                          {tx.method}
                        </Badge>
                      </td>
                      <td className="px-8 py-6">
                        {tx.proofUrl ? (
                          <Button 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-400 text-xs font-bold p-0 h-auto"
                            onClick={() => {
                              setSelectedProof(tx.proofUrl);
                              setIsModalOpen(true);
                            }}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {t('view_proof')}
                          </Button>
                        ) : (
                          <span className="text-slate-600 text-xs italic">{t('no_proof')}</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleTimeString()}</p>
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
                              variant="confirm"
                              className="h-9 px-4 rounded-xl"
                              onClick={() => handleApprove(tx)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {t('approve')}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="cancel" 
                              className="h-9 px-4 rounded-xl"
                              onClick={() => handleReject(tx)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              {t('reject')}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">{t('completed')}</span>
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

      {/* Proof Modal */}
      <AnimatePresence>
        {isModalOpen && selectedProof && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl w-full max-h-[90vh] flex flex-col"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute -top-12 right-0 text-white hover:bg-white/10 rounded-full"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedProof(null);
                }}
              >
                <XCircle className="w-8 h-8" />
              </Button>
              <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden border border-white/10 p-4">
                <img 
                  src={selectedProof} 
                  alt="Payment Proof" 
                  className="w-full h-full object-contain rounded-2xl" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
