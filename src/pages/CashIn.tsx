import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { firebaseService, where } from '../lib/firebaseService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  ArrowRight, 
  Building2, 
  CreditCard, 
  QrCode, 
  Upload, 
  CheckCircle2, 
  Lock,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Info,
  Clock
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CashIn() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [rates, setRates] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  
  // Form states
  const [selectedCountry, setSelectedCountry] = useState('Bangladesh');
  const [amountSource, setAmountSource] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [transactionCode, setTransactionCode] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubRates = firebaseService.subscribeToCollection('rates', [], (data) => {
      setRates(data);
    });

    const unsubSettings = firebaseService.subscribeToCollection('adminSettings', [], (data) => {
      const ciSettings = data.find(s => s.key === 'cash_in_settings');
      const globalSettings = data.find(s => s.key === 'global_settings');

      if (ciSettings?.value) {
        setAdminSettings(ciSettings.value);
      } else if (globalSettings?.value) {
        setAdminSettings(globalSettings.value);
      }
    });

    return () => {
      unsubRates();
      unsubSettings();
    };
  }, []);

  const countries = [
    { name: 'Bangladesh', currency: 'BDT', symbol: '৳' },
    { name: 'India', currency: 'INR', symbol: '₹' },
    { name: 'Pakistan', currency: 'PKR', symbol: 'Rs' },
    { name: 'Nepal', currency: 'NPR', symbol: 'रू' }
  ];

  const currentCountry = countries.find(c => c.name === selectedCountry) || countries[0];
  
  // Find rate from either general rate or specific account type tiers
  const exchangeRateObj = rates.find(r => r.target?.toUpperCase() === currentCountry.currency);
  const ratesCollRate = exchangeRateObj?.rate || 0;
  
  // Try to use tiered rate for 'Cash In' if defined in Admin Exchange Page
  let finalRate = ratesCollRate;
  if (exchangeRateObj?.account_types?.['Cash In']?.tieredRates) {
    const tiers = exchangeRateObj.account_types['Cash In'].tieredRates;
    if (tiers.length > 0) finalRate = tiers[0].rate;
  }
  
  const adminSetRate = adminSettings?.rates?.[currentCountry.currency];
  const countryRate = (adminSetRate !== undefined && adminSetRate !== null) ? adminSetRate : (finalRate || 0);
  
  const receiveVND = (amountSource && countryRate > 0) ? (Number(amountSource) * countryRate).toFixed(0) : '0';

  const getBanksForCountry = () => {
    if (!adminSettings) return [];
    
    // 1. Check for specific country array format from global_settings (AdminSettings.tsx)
    const countryToKey: Record<string, string> = {
      'Bangladesh': 'bangladeshBanks',
      'India': 'indiaBanks',
      'Pakistan': 'pakistanBanks',
      'Nepal': 'nepalBanks'
    };
    
    const settingsKey = countryToKey[selectedCountry];
    if (settingsKey && Array.isArray(adminSettings[settingsKey])) {
      return adminSettings[settingsKey];
    }

    // 2. Check for country-specific banks in adminSettings (AdminDeposits.tsx structure)
    if (adminSettings.countries?.[currentCountry.currency]?.banks) {
      return adminSettings.countries[currentCountry.currency].banks;
    }
    
    // Fallback/Legacy: if it's Bangladesh and we have the old fields
    if (selectedCountry === 'Bangladesh' && adminSettings.bankName) {
      return [{
        bankName: adminSettings.bankName,
        accountNumber: adminSettings.accountNumber,
        accountHolder: adminSettings.accountHolder,
        type: 'PRIMARY'
      }];
    }
    
    return [];
  };

  const handleNext = () => {
    if (step === 1) {
      if (!amountSource || Number(amountSource) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      if (countryRate <= 0) {
        toast.error('Exchange rate for this currency is not set by admin.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleConfirm();
    }
  };

  const handleConfirm = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    if (!profile?.uid || !profile?.email) {
      toast.error('You must be logged in to create a transaction.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify Password first
      const { error: authError } = await firebaseService.signIn(profile.email, password);
      if (authError) {
        toast.error('Incorrect password. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const realProofUrl = await firebaseService.uploadFile(proofFile);
      const tx = {
        uid: profile.uid,
        type: 'cash_in',
        status: 'pending',
        amount: Number(receiveVND),
        currency: 'VND',
        method: 'CASH_IN',
        sourceAmount: Number(amountSource),
        sourceCurrency: currentCountry.currency,
        country: selectedCountry,
        proofUrl: realProofUrl,
        transactionCode: transactionCode || null,
        createdAt: new Date().toISOString(),
        description: `Cash In ${amountSource} ${currentCountry.currency} from ${selectedCountry}`
      };

      const docId = await firebaseService.addDocument('transactions', tx);
      if (docId) {
        toast.success('Cash In request submitted!');
        navigate(`/waiting/${docId}`);
      } else {
        toast.error('Failed to create transaction. Please check your connection or contact admin.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-4">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-3xl font-display font-bold">{t('cashIn')}</h1>
        <p className="text-slate-400 max-w-md mx-auto">Select your country and add money safely.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
              step >= i ? "bg-green-600 text-white shadow-lg shadow-green-600/20" : "bg-white/5 text-slate-500 border border-white/10"
            )}>
              {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
            </div>
            {i < 3 && <div className={cn("w-8 h-0.5 mx-1", step > i ? "bg-green-600" : "bg-white/5")} />}
          </div>
        ))}
      </div>

      <Card className="glass-dark border-white/5 rounded-[2rem] overflow-hidden">
        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">{t('country')}</Label>
                    <select 
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setAmountSource('');
                      }}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white outline-none focus:ring-2 focus:ring-green-500/20 font-bold"
                    >
                      {countries.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">Amount ({currentCountry.currency})</Label>
                    <div className="relative">
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={amountSource}
                        onChange={(e) => setAmountSource(e.target.value)}
                        className="h-14 bg-white/5 border-white/10 text-2xl font-display font-bold rounded-2xl pl-12"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{currentCountry.symbol}</span>
                    </div>
                  </div>

                  <div className="flex justify-center -my-2">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                      <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">{t('receive_vnd')}</Label>
                    <div className="h-14 bg-white/5 border border-white/10 rounded-2xl px-4 flex items-center text-2xl font-display font-bold text-green-400">
                      ₫ {Number(receiveVND).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-3 items-start">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="text-xs text-slate-400 leading-relaxed">
                    <p className="font-bold text-blue-300 mb-1">{t('current_rate')}</p>
                    <p>1 {currentCountry.currency} = {countryRate > 0 ? countryRate : '...'} VND</p>
                    <p className="mt-1 opacity-70">Rate valid for the next 15 minutes.</p>
                  </div>
                </div>

                <Button onClick={handleNext} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-600/20 transition-all">
                  Next Step <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 text-green-500 font-bold mb-4">
                  <Building2 className="w-5 h-5" />
                  <h3>Admin {selectedCountry} Bank Accounts</h3>
                </div>

                <div className="space-y-4">
                  {getBanksForCountry().length > 0 ? (
                    getBanksForCountry().map((bank: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{bank.type || 'BANK'}</p>
                            <h4 className="text-lg font-bold text-white">{bank.bankName}</h4>
                          </div>
                          <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-brand-blue" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t('account_number')}</p>
                            <p className="font-mono text-white text-base">{bank.accountNumber}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t('account_holder')}</p>
                            <p className="text-white text-base font-bold">{bank.accountHolder}</p>
                          </div>
                        </div>
                        {adminSettings.qrCode && idx === 0 && (
                          <div className="pt-2">
                             <div className="aspect-square max-w-[200px] mx-auto bg-slate-950 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden mb-2">
                                <img src={adminSettings.qrCode} alt="QR" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                             </div>
                             <p className="text-[10px] text-center text-slate-500 uppercase font-black">Scan to Pay (Primary Option)</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl">
                       <p className="text-slate-400">Admin has not configured bank accounts for {selectedCountry}.</p>
                       <p className="text-xs text-slate-500 mt-2">Please contact admin via chat.</p>
                    </div>
                  )}
                  {adminSettings?.instructions && (
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <Label className="text-[10px] text-blue-400 uppercase font-bold tracking-widest block mb-1">Instructions</Label>
                      <p className="text-xs text-slate-400 whitespace-pre-line">{adminSettings.instructions}</p>
                    </div>
                  )}
                  {adminSettings?.terms && (
                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                      <Label className="text-[10px] text-red-400 uppercase font-bold tracking-widest block mb-1">Terms & Conditions</Label>
                      <p className="text-[10px] text-slate-500 italic whitespace-pre-line">{adminSettings.terms}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-14 text-slate-400 rounded-2xl font-bold">
                    <ChevronLeft className="mr-2 w-5 h-5" /> {t('back')}
                  </Button>
                  <Button onClick={handleNext} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all">
                    {t('confirm')} <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 text-green-500 font-bold mb-4">
                  <Upload className="w-5 h-5" />
                  <h3>{t('upload_proof')}</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">Select Payment Receipt</Label>
                    <div 
                      className={cn(
                        "relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer group",
                        proofFile ? "border-green-500/50 bg-green-500/5" : "border-white/10 hover:border-green-500/30 hover:bg-white/5"
                      )}
                      onClick={() => document.getElementById('receipt-upload')?.click()}
                    >
                      <input 
                        id="receipt-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                      <div className="flex flex-col items-center gap-4">
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                          proofFile ? "bg-green-500/20 text-green-500" : "bg-white/5 text-slate-500"
                        )}>
                          <Upload className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                          {proofFile ? (
                            <>
                              <p className="font-bold text-green-500">{proofFile.name}</p>
                              <p className="text-xs text-slate-500 mt-1">Click to change photo</p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-slate-300">Click to Upload Receipt</p>
                              <p className="text-xs text-slate-500 mt-1">Upload screen shot of your payment</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">Transaction Code (Optional)</Label>
                    <Input 
                      placeholder="e.g. TRN12345678"
                      value={transactionCode}
                      onChange={(e) => setTransactionCode(e.target.value)}
                      className="h-14 bg-white/5 border-white/10 rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">{t('password')}</Label>
                    <Input 
                      type="password"
                      placeholder="Enter password to confirm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 bg-white/5 border-white/10 rounded-2xl"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 h-14 text-slate-400 rounded-2xl font-bold">
                    <ChevronLeft className="mr-2 w-5 h-5" /> {t('back')}
                  </Button>
                  <Button 
                    onClick={handleConfirm} 
                    disabled={isSubmitting || !proofFile || !password}
                    className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-600/20"
                  >
                    {isSubmitting ? t('processing') : t('confirm_cash_in')} <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
