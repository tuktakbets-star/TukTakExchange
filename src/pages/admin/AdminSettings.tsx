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
  Plus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firebaseService.subscribeToCollection('adminSettings', [], (data) => {
      const globalSettings = data.find(s => s.key === 'global_settings');
      if (globalSettings) setSettings(globalSettings);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bangladeshBanks = [
      {
        bankName: formData.get('bdBankName1'),
        accountNumber: formData.get('bdAccNum1'),
        accountHolder: formData.get('bdAccHolder1'),
        type: formData.get('bdType1'),
      },
      {
        bankName: formData.get('bdBankName2'),
        accountNumber: formData.get('bdAccNum2'),
        accountHolder: formData.get('bdAccHolder2'),
        type: formData.get('bdType2'),
      }
    ].filter(b => b.bankName && b.accountNumber);

    const vietnamBanks = [
      {
        bankName: formData.get('vnBankName1'),
        accountNumber: formData.get('vnAccNum1'),
        accountHolder: formData.get('vnAccHolder1'),
        qrUrl: formData.get('vnQrUrl1'),
      },
      {
        bankName: formData.get('vnBankName2'),
        accountNumber: formData.get('vnAccNum2'),
        accountHolder: formData.get('vnAccHolder2'),
        qrUrl: formData.get('vnQrUrl2'),
      }
    ].filter(b => b.bankName && b.accountNumber);

    const indiaBanks = [
      { bankName: formData.get('inBankName1'), accountNumber: formData.get('inAccNum1'), accountHolder: formData.get('inAccHolder1') },
      { bankName: formData.get('inBankName2'), accountNumber: formData.get('inAccNum2'), accountHolder: formData.get('inAccHolder2') }
    ].filter(b => b.bankName && b.accountNumber);

    const pakistanBanks = [
      { bankName: formData.get('pkBankName1'), accountNumber: formData.get('pkAccNum1'), accountHolder: formData.get('pkAccHolder1') },
      { bankName: formData.get('pkBankName2'), accountNumber: formData.get('pkAccNum2'), accountHolder: formData.get('pkAccHolder2') }
    ].filter(b => b.bankName && b.accountNumber);

    const nepalBanks = [
      { bankName: formData.get('npBankName1'), accountNumber: formData.get('npAccNum1'), accountHolder: formData.get('npAccHolder1') },
      { bankName: formData.get('npBankName2'), accountNumber: formData.get('npAccNum2'), accountHolder: formData.get('npAccHolder2') }
    ].filter(b => b.bankName && b.accountNumber);

    const value = {
      systemName: formData.get('systemName'),
      supportEmail: formData.get('supportEmail'),
      withdrawalFee: formData.get('withdrawalFee'),
      transferFee: formData.get('transferFee'),
      bankName: formData.get('bankName'),
      accountNumber: formData.get('accountNumber'),
      accountHolder: formData.get('accountHolder'),
      qrCode: formData.get('qrCode'),
      bangladeshBanks,
      indiaBanks,
      pakistanBanks,
      nepalBanks,
      vietnamBanks
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
        <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="w-3 h-3 text-slate-500" />
                  {t('withdrawal_fee')} (%)
                </Label>
                <Input 
                  name="withdrawalFee" 
                  type="number"
                  step="0.01"
                  defaultValue={settings?.value?.withdrawalFee || '1.5'} 
                  className="bg-white/5 border-white/10 h-12 rounded-xl" 
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="w-3 h-3 text-slate-500" />
                  {t('transfer_fee')} (%)
                </Label>
                <Input 
                  name="transferFee" 
                  type="number"
                  step="0.01"
                  defaultValue={settings?.value?.transferFee || '0.5'} 
                  className="bg-white/5 border-white/10 h-12 rounded-xl" 
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Bank Settings */}
        <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8">
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

        <div className="lg:col-span-2 flex justify-end">
          <Button type="submit" className="h-16 px-12 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl shadow-xl shadow-red-600/20 flex items-center gap-3">
            <Save className="w-6 h-6" />
            {t('save')}
          </Button>
        </div>

        {/* Bangladesh Bank Settings */}
        <Card className="lg:col-span-2 glass-dark border-white/5 rounded-[2.5rem] p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-green-600/10 rounded-xl flex items-center justify-center text-green-500">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-display font-bold">Bangladesh Bank Details (Cash In)</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2].map(i => (
              <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-400">Account #{i}</h4>
                  <select 
                    name={`bdType${i}`} 
                    defaultValue={settings?.value?.bangladeshBanks?.[i-1]?.type || 'Bank'}
                    className="bg-white/10 border-none rounded-lg px-3 py-1 text-xs outline-none"
                  >
                    <option value="Bank">Bank</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] uppercase">Bank/Service Name</Label>
                    <Input 
                      name={`bdBankName${i}`} 
                      defaultValue={settings?.value?.bangladeshBanks?.[i-1]?.bankName}
                      placeholder="e.g. Dutch Bangla Bank / bKash"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase">Account Number</Label>
                    <Input 
                      name={`bdAccNum${i}`} 
                      defaultValue={settings?.value?.bangladeshBanks?.[i-1]?.accountNumber}
                      placeholder="017123..."
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase">Account Holder</Label>
                    <Input 
                      name={`bdAccHolder${i}`} 
                      defaultValue={settings?.value?.bangladeshBanks?.[i-1]?.accountHolder}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {[
          { key: 'indiaBanks', title: 'India Bank Details (INR Cash In)', prefix: 'in', color: 'orange' },
          { key: 'pakistanBanks', title: 'Pakistan Bank Details (PKR Cash In)', prefix: 'pk', color: 'green' },
          { key: 'nepalBanks', title: 'Nepal Bank Details (NPR Cash In)', prefix: 'blue' }
        ].map((country) => (
          <Card key={country.key} className="lg:col-span-2 glass-dark border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className={`w-10 h-10 bg-${country.color || 'slate'}-600/10 rounded-xl flex items-center justify-center text-${country.color || 'slate'}-500`}>
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-bold">{country.title}</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {[1, 2].map(i => (
                <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                  <h4 className="font-bold text-slate-400">Account #{i}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[10px] uppercase">Bank Name</Label>
                      <Input 
                        name={`${country.prefix}BankName${i}`} 
                        defaultValue={settings?.value?.[country.key]?.[i-1]?.bankName}
                        placeholder="Bank Name"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Account Number</Label>
                      <Input 
                        name={`${country.prefix}AccNum${i}`} 
                        defaultValue={settings?.value?.[country.key]?.[i-1]?.accountNumber}
                        placeholder="Account #"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Account Holder</Label>
                      <Input 
                        name={`${country.prefix}AccHolder${i}`} 
                        defaultValue={settings?.value?.[country.key]?.[i-1]?.accountHolder}
                        placeholder="Name"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {/* Vietnam Bank Settings */}
        <Card className="lg:col-span-2 glass-dark border-white/5 rounded-[2.5rem] p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-display font-bold">Vietnam Bank Details (VND Load)</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2].map(i => (
              <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-400">Vietnam Account #{i}</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] uppercase">Bank Name</Label>
                    <Input 
                      name={`vnBankName${i}`} 
                      defaultValue={settings?.value?.vietnamBanks?.[i-1]?.bankName}
                      placeholder="e.g. Vietcombank"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase">Account Number</Label>
                    <Input 
                      name={`vnAccNum${i}`} 
                      defaultValue={settings?.value?.vietnamBanks?.[i-1]?.accountNumber}
                      placeholder="0123456789"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase">Account Holder</Label>
                    <Input 
                      name={`vnAccHolder${i}`} 
                      defaultValue={settings?.value?.vietnamBanks?.[i-1]?.accountHolder}
                      placeholder="NGUYEN VAN A"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] uppercase">QR Code URL</Label>
                    <Input 
                      name={`vnQrUrl${i}`} 
                      defaultValue={settings?.value?.vietnamBanks?.[i-1]?.qrUrl}
                      placeholder="https://..."
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </form>
    </div>
  );
}
