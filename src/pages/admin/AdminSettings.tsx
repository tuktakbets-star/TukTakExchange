import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  Settings as SettingsIcon, 
  Building2, 
  QrCode, 
  Globe, 
  Percent,
  Save,
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';

export default function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState<{
    bangladeshBanks: any[];
    indiaBanks: any[];
    pakistanBanks: any[];
    nepalBanks: any[];
    vietnamBanks: any[];
  }>({
    bangladeshBanks: [],
    indiaBanks: [],
    pakistanBanks: [],
    nepalBanks: [],
    vietnamBanks: []
  });
  const [serviceFees, setServiceFees] = useState<{
    exchange: any[];
    withdraw: any[];
    recharge: any[];
  }>({
    exchange: [],
    withdraw: [],
    recharge: []
  });

  useEffect(() => {
    const unsub = firebaseService.subscribeToCollection('adminSettings', [], (data) => {
      const globalSettings = data.find(s => s.key === 'global_settings');
      if (globalSettings) {
        setSettings(globalSettings);
        if (globalSettings.value?.serviceFees) {
          setServiceFees(globalSettings.value.serviceFees);
        }
        setBanks({
          bangladeshBanks: globalSettings.value?.bangladeshBanks || [],
          indiaBanks: globalSettings.value?.indiaBanks || [],
          pakistanBanks: globalSettings.value?.pakistanBanks || [],
          nepalBanks: globalSettings.value?.nepalBanks || [],
          vietnamBanks: globalSettings.value?.vietnamBanks || []
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addBank = (type: keyof typeof banks) => {
    setBanks(prev => ({
      ...prev,
      [type]: [...prev[type], { bankName: '', accountNumber: '', accountHolder: '', active: false }]
    }));
  };

  const removeBank = (type: keyof typeof banks, index: number) => {
    setBanks(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateBank = (type: keyof typeof banks, index: number, field: string, value: any) => {
    setBanks(prev => {
      const newBanks = [...prev[type]];
      if (field === 'active' && value === true) {
        newBanks.forEach((b, i) => b.active = i === index);
      } else {
        newBanks[index] = { ...newBanks[index], [field]: value };
      }
      return { ...prev, [type]: newBanks };
    });
  };

  const addFeeTier = (type: 'exchange' | 'withdraw' | 'recharge') => {
    setServiceFees(prev => ({
      ...prev,
      [type]: [...prev[type], { min: 0, max: 0, fee: 0, type: 'fixed' }]
    }));
  };

  const removeFeeTier = (type: 'exchange' | 'withdraw' | 'recharge', index: number) => {
    setServiceFees(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateFeeTier = (type: 'exchange' | 'withdraw' | 'recharge', index: number, field: string, value: any) => {
    setServiceFees(prev => {
      const newTiers = [...prev[type]];
      newTiers[index] = { ...newTiers[index], [field]: value };
      return { ...prev, [type]: newTiers };
    });
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const value = {
      systemName: formData.get('systemName'),
      supportEmail: formData.get('supportEmail'),
      withdrawalFee: formData.get('withdrawalFee'),
      transferFee: formData.get('transferFee'),
      // Keep legacy root fields just in case, but prioritize our new lists
      bankName: formData.get('bankName'),
      accountNumber: formData.get('accountNumber'),
      accountHolder: formData.get('accountHolder'),
      qrCode: formData.get('qrCode'),
      ...banks,
      serviceFees
    };

    try {
      if (settings) {
        await firebaseService.updateDocument('adminSettings', settings.id, { value, updatedAt: new Date().toISOString() });
      } else {
        await firebaseService.addDocument('adminSettings', { key: 'global_settings', value, updatedAt: new Date().toISOString() });
      }
      toast.success(t('global_settings_updated'));
    } catch (error) {
      toast.error(t('settings_update_failed'));
    }
  };

  const renderBankList = (type: keyof typeof banks, title: string, color: string) => (
    <Card className="lg:col-span-2 glass-dark border-white/5 rounded-[2.5rem] p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-${color}-600/10 rounded-xl flex items-center justify-center text-${color}-500`}>
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-display font-bold">{title}</h3>
        </div>
        <Button 
          type="button"
          onClick={() => addBank(type)}
          variant="outline"
          className="border-white/10 hover:bg-white/5 h-10 px-4 rounded-xl flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </Button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {banks[type].length === 0 ? (
          <p className="col-span-2 text-center py-8 text-slate-500 italic">No bank accounts configured.</p>
        ) : (
          banks[type].map((bank, index) => (
            <div key={index} className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4 relative group">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-slate-400">Account #{index + 1}</h4>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[8px] font-bold uppercase", bank.active ? "text-green-500" : "text-slate-500")}>
                      {bank.active ? 'Active' : 'Inactive'}
                    </span>
                    <Switch 
                      checked={bank.active}
                      onCheckedChange={(checked) => updateBank(type, index, 'active', checked)}
                    />
                  </div>
                  <Button 
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeBank(type, index)}
                    className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase">Bank/Wallet Name</Label>
                  <Input 
                    value={bank.bankName}
                    onChange={(e) => updateBank(type, index, 'bankName', e.target.value)}
                    placeholder="Bank Name"
                    className="bg-white/5 border-white/10 h-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Account Number</Label>
                    <Input 
                      value={bank.accountNumber}
                      onChange={(e) => updateBank(type, index, 'accountNumber', e.target.value)}
                      placeholder="Account #"
                      className="bg-white/5 border-white/10 h-10 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Account Holder</Label>
                    <Input 
                      value={bank.accountHolder}
                      onChange={(e) => updateBank(type, index, 'accountHolder', e.target.value)}
                      placeholder="Holder Name"
                      className="bg-white/5 border-white/10 h-10"
                    />
                  </div>
                </div>
                {type === 'vietnamBanks' && (
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">QR Code URL</Label>
                    <Input 
                      value={bank.qrUrl}
                      onChange={(e) => updateBank(type, index, 'qrUrl', e.target.value)}
                      placeholder="https://..."
                      className="bg-white/5 border-white/10 h-10"
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  const renderFeeTiers = (type: 'exchange' | 'withdraw' | 'recharge', title: string, color: string) => (
    <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-${color}-500/10 rounded-xl flex items-center justify-center text-${color}-500`}>
            <DollarSign className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-display font-bold">{title} Fees</h3>
        </div>
        <Button 
          type="button" 
          onClick={() => addFeeTier(type)}
          variant="outline"
          className="border-white/10 hover:bg-white/5 h-10 px-4 rounded-xl flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Tier
        </Button>
      </div>

      <div className="space-y-4">
        {serviceFees[type].length === 0 ? (
          <p className="text-center py-8 text-slate-500 text-sm italic">No fee tiers configured. Transaction will have 0 fee.</p>
        ) : (
          serviceFees[type].map((tier, index) => (
            <div key={index} className="grid grid-cols-5 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 relative group">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-500">Min Amount</Label>
                <Input 
                  type="number" 
                  value={tier.min} 
                  onChange={(e) => updateFeeTier(type, index, 'min', Number(e.target.value))}
                  className="bg-transparent border-white/10 h-10 px-3 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-500">Max Amount</Label>
                <Input 
                  type="number" 
                  value={tier.max} 
                  onChange={(e) => updateFeeTier(type, index, 'max', Number(e.target.value))}
                  className="bg-transparent border-white/10 h-10 px-3 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-500">Fee</Label>
                <Input 
                  type="number" 
                  value={tier.fee} 
                  onChange={(e) => updateFeeTier(type, index, 'fee', Number(e.target.value))}
                  className="bg-transparent border-white/10 h-10 px-3 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-500">Type</Label>
                <select 
                  value={tier.type} 
                  onChange={(e) => updateFeeTier(type, index, 'type', e.target.value)}
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-2 text-white outline-none text-xs"
                >
                  <option value="fixed">Fixed</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              <div className="flex items-end justify-center">
                <Button 
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeFeeTier(type, index)}
                  className="h-10 w-10 text-red-500 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('settings')}</h1>
          <p className="text-slate-400 mt-1">{t('realTimeStats')}</p>
        </div>
      </div>

      <form key={settings?.id || 'loading'} onSubmit={handleSaveSettings} className="grid lg:grid-cols-2 gap-8">
        {/* General Settings */}
        <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 h-fit">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-display font-bold">{t('about')}</h3>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('system_name')}</Label>
              <Input 
                name="systemName" 
                defaultValue={settings?.value?.systemName || 'Tuktak Exchange'} 
                className="bg-white/5 border-white/10 h-12 rounded-xl" 
              />
            </div>
            <div className="space-y-2">
              <Label>{t('support_email')}</Label>
              <Input 
                name="supportEmail" 
                type="email"
                defaultValue={settings?.value?.supportEmail || 'support@tuktak.com'} 
                className="bg-white/5 border-white/10 h-12 rounded-xl" 
              />
            </div>
          </div>
        </Card>

        {/* Bank Settings */}
        <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 h-fit">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-red-600/10 rounded-xl flex items-center justify-center text-red-500">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-display font-bold">{t('global_bank_info')}</h3>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('check_bank')}</Label>
              <select 
                name="bankName" 
                defaultValue={settings?.value?.bankName}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:ring-2 focus:ring-red-500/20 text-sm"
              >
                <option value="">{t('select_bank')}</option>
                <option value="Vietcombank">Vietcombank</option>
                <option value="Techcombank">Techcombank</option>
                <option value="BIDV">BIDV</option>
                <option value="Agribank">Agribank</option>
                <option value="VPBank">VPBank</option>
                <option value="MB Bank">MB Bank</option>
                <option value="ACB">ACB</option>
                <option value="TPBank">TPBank</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('account_number')}</Label>
                <Input 
                  name="accountNumber" 
                  defaultValue={settings?.value?.accountNumber} 
                  className="bg-white/5 border-white/10 h-12 rounded-xl" 
                />
              </div>
              <div className="space-y-2">
                <Label>{t('account_holder')}</Label>
                <Input 
                  name="accountHolder" 
                  defaultValue={settings?.value?.accountHolder} 
                  className="bg-white/5 border-white/10 h-12 rounded-xl" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-slate-500" />
                {t('qr_code')}
              </Label>
              <Input 
                name="qrCode" 
                defaultValue={settings?.value?.qrCode} 
                placeholder="https://..." 
                className="bg-white/5 border-white/10 h-12 rounded-xl" 
              />
            </div>
          </div>
        </Card>

        {/* Dynamic Fee Tiers */}
        <div className="lg:col-span-2 grid md:grid-cols-2 xl:grid-cols-3 gap-8">
          {renderFeeTiers('exchange', 'Exchange', 'purple')}
          {renderFeeTiers('withdraw', 'Withdraw', 'blue')}
          {renderFeeTiers('recharge', 'Recharge', 'yellow')}
        </div>

        <div className="lg:col-span-2 flex justify-end">
          <Button type="submit" className="h-16 px-12 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl shadow-xl shadow-red-600/20 flex items-center gap-3">
            <Save className="w-6 h-6" />
            {t('save')}
          </Button>
        </div>

        {/* Country Bank Settings */}
        {renderBankList('bangladeshBanks', 'Bangladesh Bank Details (Cash In)', 'green')}
        {renderBankList('indiaBanks', 'India Bank Details (INR Cash In)', 'orange')}
        {renderBankList('pakistanBanks', 'Pakistan Bank Details (PKR Cash In)', 'green')}
        {renderBankList('nepalBanks', 'Nepal Bank Details (NPR Cash In)', 'blue')}
        {renderBankList('vietnamBanks', 'Vietnam Bank Details (VND Load)', 'brand-blue')}
      </form>
    </div>
  );
}
