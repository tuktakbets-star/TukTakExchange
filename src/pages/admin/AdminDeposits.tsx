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
  Info,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea.tsx';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDeposits() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'add_money' | 'cash_in'>('add_money');
  const [selectedSetupCountry, setSelectedSetupCountry] = useState('BDT');
  const [addMoneySettings, setAddMoneySettings] = useState<any>(null);
  const [cashInSettings, setCashInSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [localQrFile, setLocalQrFile] = useState<File | null>(null);
  const [localQrPreview, setLocalQrPreview] = useState<string | null>(null);
  const [bankList, setBankList] = useState<any[]>([]);
  const [bankFiles, setBankFiles] = useState<Map<number, File>>(new Map());
  const [bankPreviews, setBankPreviews] = useState<Map<number, string>>(new Map());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  useEffect(() => {
    const unsubTX = firebaseService.subscribeToCollection('transactions', [], (data) => {
      setRequests(data.filter(tx => tx.type === 'deposit' || tx.type === 'cash_in' || tx.type === 'add_money'));
    });
    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => {
      // Map 'id' to 'uid' if necessary for backward compatibility in the app logic
      const mapped = data.map((u: any) => ({ ...u, uid: u.id || u.uid }));
      setUsers(mapped);
    });
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
    if (activeTab === 'add_money') {
      setBankList(addMoneySettings?.value?.banks || []);
    } else {
      setBankList(cashInSettings?.value?.countries?.[selectedSetupCountry]?.banks || []);
    }
  }, [activeTab, selectedSetupCountry, addMoneySettings, cashInSettings]);

  const addBankRow = () => {
    setBankList([...bankList, { bankName: '', accountNumber: '', accountHolder: '', active: false, qrUrl: '' }]);
  };

  const removeBankRow = (index: number) => {
    setBankList(bankList.filter((_, i) => i !== index));
    const newFiles = new Map(bankFiles);
    newFiles.delete(index);
    setBankFiles(newFiles);
    const newPreviews = new Map(bankPreviews);
    newPreviews.delete(index);
    setBankPreviews(newPreviews);
  };

  const updateBankRow = (index: number, field: string, value: any) => {
    const newBanks = [...bankList];
    if (field === 'active' && value === true) {
      // Toggle all others to false
      newBanks.forEach((b, i) => b.active = i === index);
    } else {
      newBanks[index] = { ...newBanks[index], [field]: value };
    }
    setBankList(newBanks);
  };

  const handleBankQrUpload = (index: number, file: File) => {
    setBankFiles(new Map(bankFiles.set(index, file)));
    const reader = new FileReader();
    reader.onload = (e) => {
      setBankPreviews(new Map(bankPreviews.set(index, e.target?.result as string)));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setLocalQrFile(null);
    setLocalQrPreview(null);
  }, [activeTab]);

  const handleUpdateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentSettings = activeTab === 'add_money' ? addMoneySettings : cashInSettings;
    const settingsKey = activeTab === 'add_money' ? 'add_money_settings' : 'cash_in_settings';
    
    setIsUploading(true);
    try {
      // 1. Upload individual bank QR codes
      const updatedBanks = await Promise.all(bankList.map(async (bank, index) => {
        const file = bankFiles.get(index);
        if (file) {
          const url = await firebaseService.uploadFile(file);
          return { ...bank, qrUrl: url };
        }
        return bank;
      }));

      // 2. Filter valid banks
      const banks = updatedBanks.filter(b => b.bankName && b.accountNumber);

      let value = { ...currentSettings?.value };

      if (activeTab === 'add_money') {
        value = {
          ...value,
          banks,
          instructions: formData.get('instructions'),
          terms: formData.get('terms')
        };
        // Use the active bank's QR as the main QR if one is active
        const activeBank = banks.find(b => b.active);
        if (activeBank) value.qrCode = activeBank.qrUrl;
      } else {
        const countryKey = selectedSetupCountry;
        const rate = parseFloat(formData.get('rate') as string) || 0;
        
        const newRates = { ...(value.rates || {}), [countryKey]: rate };
        const newCountries = { 
          ...(value.countries || {}), 
          [countryKey]: { 
            banks,
            updatedAt: new Date().toISOString()
          } 
        };

        value = {
          ...value,
          instructions: formData.get('instructions'),
          terms: formData.get('terms'),
          rates: newRates,
          countries: newCountries
        };
        
        const activeBank = banks.find(b => b.active);
        if (activeBank) value.qrCode = activeBank.qrUrl;
      }

      if (currentSettings) {
        await firebaseService.updateDocument('adminSettings', currentSettings.id, { value, updatedAt: new Date().toISOString() });
      } else {
        await firebaseService.addDocument('adminSettings', { key: settingsKey, value, updatedAt: new Date().toISOString() });
      }
      
      // Clear local file states
      setBankFiles(new Map());
      setBankPreviews(new Map());
      
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error(error);
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
          await firebaseService.updateWalletBalance(tx.uid, tx.currency, tx.amount, 0);

          await firebaseService.updateDocument('transactions', tx.id, { 
            status: 'completed', 
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
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600/10 rounded-xl flex items-center justify-center text-red-500">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-display font-bold">
              {activeTab === 'add_money' ? 'Add Money Setup (Vietnam)' : 'Cash In Setup (Multiple Countries)'}
            </h3>
          </div>

          {activeTab === 'cash_in' && (
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
              {['BDT', 'INR', 'PKR', 'NPR'].map(curr => (
                <button
                  key={curr}
                  onClick={() => setSelectedSetupCountry(curr)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    selectedSetupCountry === curr ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  {curr}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <form key={`${activeTab}-${selectedSetupCountry}-${currentSettings?.id}`} onSubmit={handleUpdateSettings} className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-lg font-display font-bold block">Bank Account Settings</Label>
                <p className="text-xs text-slate-500">Configure receiving accounts for this section. Only one account can be active at a time.</p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addBankRow}
                className="h-10 px-4 rounded-xl border-white/10 hover:bg-white/5 flex items-center gap-2 font-bold"
              >
                <Plus className="w-4 h-4" />
                Add New Bank
              </Button>
            </div>

            {activeTab === 'cash_in' && (
              <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl mb-6">
                <Label className="text-[10px] uppercase text-red-400 font-bold tracking-widest block mb-1">Cash In Rate Settings ({selectedSetupCountry})</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                     <Input 
                      name="rate" 
                      type="number"
                      step="0.00000001"
                      defaultValue={currentSettings?.value?.rates?.[selectedSetupCountry]}
                      placeholder="e.g. 0.0035" 
                      className="bg-white/5 border-white/10 h-12 rounded-xl pl-10" 
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">1 {selectedSetupCountry} = ? VND</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 custom-scrollbar max-h-[600px]">
              {bankList.length === 0 ? (
                <div className="md:col-span-2 text-center py-12 rounded-[2.5rem] border border-dashed border-white/10 bg-white/5">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400 font-medium">No banks added yet</p>
                  <p className="text-slate-600 text-sm mt-1">Click the button above to add your first receiving account.</p>
                </div>
              ) : (
                bankList.map((bank, index) => (
                  <Card key={index} className={cn(
                    "relative group overflow-hidden border transition-all duration-300 rounded-[2rem]",
                    bank.active ? "bg-red-600/5 border-red-600/20" : "bg-white/5 border-white/10"
                  )}>
                    {/* Bank Header with Switch */}
                    <div className={cn(
                      "flex items-center justify-between p-5 border-b",
                      bank.active ? "bg-red-600/10 border-red-600/10" : "bg-white/5 border-white/5"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          bank.active ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-white/5 text-slate-400"
                        )}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">Account #{index + 1}</span>
                          <h4 className="font-bold text-sm leading-none">{bank.bankName || 'New Account'}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-black/20 py-2 px-3 rounded-xl border border-white/5">
                          <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", bank.active ? "text-green-500" : "text-slate-500")}>
                            {bank.active ? 'Active' : 'OFF'}
                          </span>
                          <Switch 
                            checked={bank.active}
                            onCheckedChange={(checked) => updateBankRow(index, 'active', checked)}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </div>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeBankRow(index)}
                          className="h-10 w-10 text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Photo Section */}
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-2">
                           <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">QR Code Photo</Label>
                           <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById(`bank-qr-${index}`)?.click()}
                                className="h-12 px-4 rounded-xl border-white/10 hover:bg-white/5 flex items-center gap-3 flex-1"
                              >
                                <Upload className="w-4 h-4" />
                                <span className="text-xs">{bankFiles.get(index) ? 'Photo Selected' : 'Choose Photo'}</span>
                              </Button>
                              <input 
                                id={`bank-qr-${index}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleBankQrUpload(index, file);
                                }}
                              />
                           </div>
                        </div>

                        {(bankPreviews.get(index) || bank.qrUrl) && (
                          <div className="w-20 h-20 bg-slate-950 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            <img 
                              src={bankPreviews.get(index) || bank.qrUrl} 
                              alt="QR" 
                              className="w-full h-full object-contain p-2"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Bank/Wallet Name</Label>
                          <Input 
                            value={bank.bankName}
                            onChange={(e) => updateBankRow(index, 'bankName', e.target.value)}
                            placeholder="e.g. Vietcombank / bKash" 
                            className="bg-white/5 border-white/10 h-12 rounded-xl text-sm" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Account Holder</Label>
                          <Input 
                            value={bank.accountHolder}
                            onChange={(e) => updateBankRow(index, 'accountHolder', e.target.value)}
                            placeholder="Full Name" 
                            className="bg-white/5 border-white/10 h-12 rounded-xl text-sm" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Account Number / Phone</Label>
                          <Input 
                            value={bank.accountNumber}
                            onChange={(e) => updateBankRow(index, 'accountNumber', e.target.value)}
                            placeholder="0123456789" 
                            className="bg-white/5 border-white/10 h-12 rounded-xl text-sm font-mono" 
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
            
            <div className="space-y-2 mt-4">
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

            <div className="space-y-2">
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
              {isUploading ? 'Uploading...' : 'Save All Settings'}
            </Button>
            <p className="text-[10px] text-slate-500 mt-2 text-center">Settings globally updated for {activeTab === 'cash_in' ? selectedSetupCountry : 'Vietnam'}.</p>
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

        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
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
                        <Badge variant="outline" className="border-white/10 bg-white/5 capitalize text-[10px]">
                          {tx.method || tx.type || 'deposit'}
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
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-slate-400">
                        {user?.displayName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm tracking-tight">{user?.displayName || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">#{tx.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                      tx.status === 'completed' ? "bg-green-500/10 text-green-500" :
                      tx.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {tx.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Amount</p>
                      <p className="text-lg font-bold">₫{tx.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{tx.currency}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Method</p>
                      <Badge variant="outline" className="border-white/10 bg-white/5 capitalize text-[10px]">
                        {tx.method || tx.type || 'deposit'}
                      </Badge>
                      <p className="text-[10px] text-slate-500 mt-2">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {tx.proofUrl ? (
                      <Button 
                        variant="ghost" 
                        className="text-red-500 text-[10px] font-bold uppercase p-0 h-auto"
                        onClick={() => {
                          setSelectedProof(tx.proofUrl);
                          setIsModalOpen(true);
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Proof
                      </Button>
                    ) : (
                      <span className="text-slate-600 text-[10px] italic">No proof</span>
                    )}
                  </div>

                  {tx.status === 'pending' && (
                    <div className="pt-2 flex gap-2">
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-500 h-11 rounded-2xl font-bold text-xs"
                        onClick={() => handleApprove(tx)}
                      >
                        Approve
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="flex-1 text-red-400 bg-red-500/5 hover:bg-red-500/10 h-11 rounded-2xl font-bold text-xs"
                        onClick={() => handleReject(tx)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
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
