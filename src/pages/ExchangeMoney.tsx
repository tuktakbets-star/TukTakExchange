import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { supabaseService, where } from '../lib/supabaseService';
import { calculateServiceFee } from '../lib/feeUtils';
import { 
  Send, 
  ArrowRight, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  User,
  Globe,
  Lock,
  Upload,
  FileText,
  Building2,
  QrCode,
  ChevronRight,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExchangeMoney() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [step, setStep] = useState(1); // 1: Amount, 2: Bank Details, 3: Review
  
  // Form states
  const [sourceCurrency, setSourceCurrency] = useState('VND');
  const [targetCurrency, setTargetCurrency] = useState('BDT');
  const [accountType, setAccountType] = useState('bKash');
  const [amount, setAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [activeSide, setActiveSide] = useState<'source' | 'target' | null>(null);
  const [receiverCountry, setReceiverCountry] = useState('Bangladesh');
  const [receiverName, setReceiverName] = useState('');
  const [receiverBankName, setReceiverBankName] = useState('');
  const [receiverAccountNumber, setReceiverAccountNumber] = useState('');
  const [receiverBranch, setReceiverBranch] = useState('');
  const [receiverIfsc, setReceiverIfsc] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAccountTypeSelect, setReceiverAccountTypeSelect] = useState('Savings');
  const [receiverNote, setReceiverNote] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  const [receiverQrFile, setReceiverQrFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [showInitialWarning, setShowInitialWarning] = useState(true);
  const [fee, setFee] = useState(0);

  useEffect(() => {
    const unsub = supabaseService.subscribeToCollection('adminSettings', [], (data) => {
      const globalSettings = data.find(s => s.key === 'global_settings');
      if (globalSettings) setAdminSettings(globalSettings.value);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;

    const unsubWallets = supabaseService.subscribeToCollection(
      'wallets',
      [where('uid', '==', profile.uid)],
      (data) => setWallets(data)
    );

    const unsubRates = supabaseService.subscribeToCollection(
      'rates',
      [],
      (data) => setRates(data)
    );

    return () => {
      unsubWallets();
      unsubRates();
    };
  }, [profile?.uid]);

  const countryToCurrency: Record<string, string> = {
    'Bangladesh': 'BDT',
    'India': 'INR',
    'Pakistan': 'PKR',
    'Nepal': 'NPR',
    'Vietnam': 'VND'
  };

  const accountTypesMap: Record<string, string[]> = {
    'Bangladesh': ['bKash', 'Nagad', 'Bank Transfer', 'Rocket', 'upay'],
    'India': ['UPI', 'IMPS', 'Digital eRupee', 'Paytm'],
    'Pakistan': ['Easypaisa-PK Only', 'Meezan Bank', 'NayaPay', 'SadaPay'],
    'Nepal': ['Esewa', 'Khalti', 'IME Pay'],
    'Vietnam': ['Bank Transfer', 'MoMo', 'ZaloPay']
  };

  useEffect(() => {
    const curr = countryToCurrency[receiverCountry];
    if (curr) {
      setTargetCurrency(curr);
      const types = accountTypesMap[receiverCountry] || [];
      if (!types.includes(accountType)) {
        setAccountType(types[0] || '');
      }
    }
  }, [receiverCountry]);

  useEffect(() => {
    // Auto-fill bank name if it's a mobile wallet
    if (accountType && accountType !== 'Bank Transfer') {
      const allWalletTypes = Object.values(accountTypesMap).flat().filter(t => t !== 'Bank Transfer');
      if (!receiverBankName || allWalletTypes.includes(receiverBankName)) {
        setReceiverBankName(accountType);
      }
    } else if (accountType === 'Bank Transfer' && Object.values(accountTypesMap).flat().includes(receiverBankName)) {
      setReceiverBankName('');
    }
  }, [accountType]);

  // Updated: Use tiered rates based on the sending amount AND account type
  const rateDoc = rates?.find(r => r.target?.toUpperCase() === targetCurrency?.toUpperCase());
  
  // Try to find tiered rates for the specific account type first
  const accountData = rateDoc?.account_types?.[accountType] || rateDoc?.accountTypes?.[accountType];
  const tieredRates = Array.isArray(accountData?.tieredRates) ? accountData.tieredRates : 
                      (Array.isArray(rateDoc?.tiered_rates) ? rateDoc.tiered_rates : 
                      (Array.isArray(rateDoc?.tieredRates) ? rateDoc.tieredRates : []));
  
  const amountNum = Number(amount) || 0;

  // Find the applicable tier based on VND amount
  const applicableTier = tieredRates.find((t: any) => {
    const min = Number(t.min) || 0;
    const max = Number(t.max) || 0;
    return amountNum >= min && (max === 0 || amountNum <= max);
  });

  // Calculate Rate
  const currentRate = applicableTier && Number(applicableTier.rate) > 0 ? Number(applicableTier.rate) : (Number(rateDoc?.rate) || 0);

  // Sync calculations reactively to handle rate updates (tiers)
  // Manual amount handlers handle cross-calculations now

  useEffect(() => {
    const amountNum = Number(amount) || 0;
    const tiers = adminSettings?.serviceFees?.exchange || [];
    const calculatedFee = calculateServiceFee(amountNum, tiers);
    setFee(calculatedFee);
  }, [amount, adminSettings]);

  const handleAmountChange = (val: string) => {
    setActiveSide('source');
    setAmount(val);
    if (!val) {
      setTargetAmount('');
      return;
    }
    // Recalculate rate based on the new amount immediately for accurate calculation
    const amountNum = Number(val) || 0;
    const tier = tieredRates.find((t: any) => {
      const min = Number(t.min) || 0;
      const max = Number(t.max) || 0;
      return amountNum >= min && (max === 0 || amountNum <= max);
    });
    const calculatedRate = tier && Number(tier.rate) > 0 ? Number(tier.rate) : (Number(rateDoc?.rate) || 0);

    if (calculatedRate > 0) {
      const calculated = (Number(val) / calculatedRate).toFixed(2);
      setTargetAmount(calculated);
    }
  };

  const handleTargetAmountChange = (val: string) => {
    setActiveSide('target');
    setTargetAmount(val);
    if (!val) {
      setAmount('');
      return;
    }
    
    // For backwards calculation from target, we use the currentRate
    // but try to find the VND amount that would result in this target
    if (currentRate > 0) {
      const calculated = (Number(val) * currentRate).toFixed(0);
      setAmount(calculated);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      const minAmount = (accountType === 'Bank Transfer') ? 5000000 : 200000;
      const amountNum = Number(amount);
      
      if (!amount || amountNum < minAmount) {
        toast.error(`Minimum Exchange amount for ${accountType} is ${minAmount.toLocaleString()} VND`);
        return;
      }
      if (!currentRate || currentRate <= 0) {
        toast.error(t('rate_not_set'));
        return;
      }
      const wallet = wallets.find(w => w.currency === sourceCurrency);
      const spendable = (wallet?.balance || 0) - (wallet?.pendingLocked || 0);
      if (!wallet || spendable < Number(amount) + Number(fee)) {
        toast.error('Insufficient balance');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate based on Country and Account Type
      if (receiverCountry === 'Bangladesh') {
        if (['bKash', 'Nagad', 'Rocket', 'upay'].includes(accountType)) {
          if (!receiverAccountNumber || !receiverName) {
            toast.error('Please fill in Wallet Number and Receiver Name');
            return;
          }
        } else {
          if (!receiverBankName || !receiverAccountNumber || !receiverName) {
            toast.error('Please fill in Bank Name, Account Number and Holder Name');
            return;
          }
        }
      } else if (receiverCountry === 'India') {
        if (accountType === 'UPI') {
          if (!receiverName || !receiverAccountNumber) { // Using AccountNumber as UPI ID field or dedicated?
            toast.error('Please fill in Holder Name and UPI ID');
            return;
          }
        } else if (['IMPS', 'Bank Transfer'].includes(accountType)) {
          if (!receiverName || !receiverBankName || !receiverAccountNumber || !receiverIfsc) {
            toast.error('Please fill in Holder Name, Bank Name, Account Number and IFSC Code');
            return;
          }
        } else if (accountType === 'Digital eRupee') {
          if (!receiverName || !receiverAccountNumber) { // AccountNumber as VPA
            toast.error('Please fill in Holder Name and Digital eRupee wallet VPA');
            return;
          }
        } else if (accountType === 'Paytm') {
          if (!receiverName || !receiverAccountNumber) {
            toast.error('Please fill in Holder Name and Account Number');
            return;
          }
        }
      } else if (receiverCountry === 'Pakistan') {
        if (!receiverName || !receiverAccountNumber) {
          toast.error('Please fill in Holder Name and Account Number');
          return;
        }
      } else if (receiverCountry === 'Nepal') {
        if (accountType === 'Esewa') {
          if (!receiverName || !receiverEmail || !receiverPhone) {
            toast.error('Please fill in Holder Name, Email and Phone Number');
            return;
          }
        } else if (accountType === 'Khalti') {
          if (!receiverName || !receiverPhone) {
            toast.error('Please fill in Holder Name and Phone Number');
            return;
          }
        } else if (accountType === 'IME Pay') {
          if (!receiverName || !receiverPhone) {
            toast.error('Please fill in Holder Name and IMEpay Mobile Number');
            return;
          }
        }
      }
      setStep(3);
    }
  };

  const handleSend = async () => {
    if (!password) {
      toast.error('Please enter your password to confirm');
      return;
    }
    
    if (!profile?.uid || !profile?.email) {
      toast.error('You must be logged in to create a transaction.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Verify Password first
      const { error: authError } = await supabaseService.signIn(profile.email, password);
      if (authError) {
        toast.error('Incorrect password. Please try again.');
        setIsSubmitting(false);
        return;
      }

      let qrUrl = null;
      if (receiverQrFile) {
        qrUrl = await supabaseService.uploadFile(receiverQrFile);
      }

      const tx: any = {
        uid: profile?.uid,
        user_name: profile?.full_name || profile?.displayName || "Customer",
        full_name: profile?.full_name || profile?.displayName || "Customer",
        type: 'exchange',
        status: 'pending',
        amount: Number(amount),
        currency: sourceCurrency,
        target_amount: Number(targetAmount),
        target_currency: targetCurrency,
        target_country: receiverCountry,
        account_type: accountType,
        fee: Number(fee),
        total_to_deduct: Number(amount) + Number(fee),
        bank_info: {
          accountName: receiverName,
          bankName: receiverBankName || accountType, // Fallback to account type if bank name empty
          accountNumber: receiverAccountNumber,
          branch: receiverBranch,
          otherDetails: otherDetails,
          email: receiverEmail,
          phone: receiverPhone,
          ifsc: receiverIfsc,
          accountTypeSelect: receiverAccountTypeSelect,
          note: receiverNote,
          qrCode: qrUrl,
          accountType: accountType // Store account type explicitly
        },
        description: description || `Exchange to ${receiverName}`,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const response = await supabaseService.addDocument('transactions', tx);
      const docId = typeof response === 'string' ? response : (response as any)?.id;
      
      if (!docId) {
        throw new Error('Database failed to create transaction record');
      }

      // Lock balance immediately (Hidden deduction)
      const wallet = wallets.find(w => w.currency === sourceCurrency);
      if (wallet) {
        await supabaseService.updateWalletBalance(profile?.uid!, sourceCurrency, 0, Number(amount) + Number(fee));
      }
      
      toast.success('Exchange request submitted! Admin will verify.');
      navigate(`/waiting/${docId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to initiate exchange');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold mb-2">{t('exchangeMoney')}</h1>
        <p className="text-slate-400">{t('hero_subtitle')}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300",
              step >= i ? "bg-brand-blue text-white shadow-lg shadow-blue-600/20" : "bg-white/5 text-slate-500 border border-white/10"
            )}>
              {step > i ? <CheckCircle2 className="w-6 h-6" /> : i}
            </div>
            {i < 3 && (
              <div className={cn(
                "w-12 h-0.5 mx-2 rounded-full",
                step > i ? "bg-brand-blue" : "bg-white/5"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Initial Warning Modal */}
      <AnimatePresence>
        {showInitialWarning && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-yellow-500/30 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_50px_rgba(234,179,8,0.15)] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 animate-pulse" />
              
              <div className="text-center">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <AlertTriangle className="w-10 h-10 text-yellow-500" />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-black text-white mb-6 uppercase tracking-tight">
                  {t('warning')}
                </h2>
                
                <div className="bg-white/5 rounded-3xl p-6 md:p-8 border border-white/5 mb-8">
                  <p className="text-lg md:text-xl leading-relaxed text-slate-200 font-medium whitespace-pre-wrap">
                    {t('exchange_warning_message')}
                  </p>
                </div>

                <Button 
                  onClick={() => setShowInitialWarning(false)}
                  className="w-full h-16 bg-yellow-500 hover:bg-yellow-400 text-black text-xl font-black rounded-2xl shadow-xl shadow-yellow-500/20 transition-all active:scale-95"
                >
                  {t('i_agree')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-5 gap-8">
        <Card className="lg:col-span-3 glass-dark border-white/5 rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-xs uppercase tracking-wider">Receiver Country</Label>
                        <Select value={receiverCountry} onValueChange={setReceiverCountry}>
                          <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                            <SelectItem value="Vietnam">Vietnam</SelectItem>
                            <SelectItem value="India">India</SelectItem>
                            <SelectItem value="Pakistan">Pakistan</SelectItem>
                            <SelectItem value="Nepal">Nepal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-xs uppercase tracking-wider">Account Type</Label>
                        <Select value={accountType} onValueChange={setAccountType}>
                          <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            {(accountTypesMap[receiverCountry] || []).map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <Label className="text-slate-400 text-xs uppercase tracking-wider">{t('amount')} (VND)</Label>
                      <div className="flex gap-4">
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          onFocus={() => setActiveSide('source')}
                          className="bg-transparent border-none text-3xl font-display font-bold p-0 h-auto focus-visible:ring-0"
                        />
                        <Select value={sourceCurrency} onValueChange={setSourceCurrency}>
                          <SelectTrigger className="w-32 bg-slate-800 border-none rounded-xl h-12 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="VND">VND</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-slate-500">
                        {t('totalBalance')}: {wallets.find(w => w.currency === sourceCurrency)?.balance.toLocaleString() || 0} {sourceCurrency}
                      </p>
                    </div>

                    <div className="flex justify-center -my-2 relative z-10">
                      <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center shadow-lg">
                        <RefreshCw className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <Label className="text-slate-400 text-xs uppercase tracking-wider">{t('receiver_gets')}</Label>
                      <div className="flex gap-4">
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={targetAmount}
                          onChange={(e) => handleTargetAmountChange(e.target.value)}
                          onFocus={() => setActiveSide('target')}
                          className="bg-transparent border-none text-3xl font-display font-bold p-0 h-auto focus-visible:ring-0"
                        />
                        <Select value={targetCurrency} disabled>
                          <SelectTrigger className="w-32 bg-slate-800 border-none rounded-xl h-12 font-bold opacity-50 cursor-not-allowed">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="BDT">BDT</SelectItem>
                            <SelectItem value="INR">INR</SelectItem>
                            <SelectItem value="PKR">PKR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="NPR">NPR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{t('current_rate')}</span>
                      <span className="font-medium">
                        {currentRate ? `1 ${targetCurrency} = ${currentRate} ${sourceCurrency}` : t('rate_not_set')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Service Fee</span>
                      <span className="font-medium flex items-center gap-1">
                        <Calculator className="w-3 h-3 text-brand-blue" />
                        {fee.toLocaleString()} {sourceCurrency}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between font-bold">
                      <span>{t('totalToPay')}</span>
                      <span className="text-brand-blue">{(Number(amount) + Number(fee)).toLocaleString()} {sourceCurrency}</span>
                    </div>
                  </div>

                  <Button onClick={handleNext} className="w-full h-14 bg-brand-blue hover:bg-blue-500 text-white rounded-2xl text-lg font-bold">
                    {t('confirmTransfer')}
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
                  {/* Step Header with locked info */}
                  <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 shadow-lg">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('target_country')}</p>
                        <p className="text-xl font-black text-white">{receiverCountry}</p>
                      </div>
                    </div>
                    <div className="h-10 w-px bg-white/5" />
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('account_type')}</p>
                      <p className="text-xl font-black text-brand-blue">{accountType}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Render fields conditionally based on Country and Account Type */}
                    
                    {/* BANGLADESH */}
                    {receiverCountry === 'Bangladesh' && (
                      <>
                        {['bKash', 'Nagad', 'Rocket', 'upay'].includes(accountType) ? (
                          <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest leading-loose">
                                Notice: {accountType} Personal only. Merchant or Agent numbers are not accepted.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Wallet Type</Label>
                              <Input 
                                value={`${accountType} Personal`}
                                disabled
                                className="bg-white/5 border-white/10 h-12 rounded-xl opacity-70"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Wallet Number</Label>
                              <Input 
                                placeholder="098765432"
                                value={receiverAccountNumber}
                                onChange={(e) => setReceiverAccountNumber(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Receiver Name</Label>
                              <Input 
                                placeholder="Receiver Name"
                                value={receiverName}
                                onChange={(e) => setReceiverName(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Account Holder Name</Label>
                              <Input 
                                placeholder="Full Name as per Bank Account"
                                value={receiverName}
                                onChange={(e) => setReceiverName(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Bank Name</Label>
                              <Input 
                                placeholder="e.g. Dutch Bangla Bank, City Bank etc."
                                value={receiverBankName}
                                onChange={(e) => setReceiverBankName(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Bank Account Number</Label>
                              <Input 
                                placeholder="Bank Account Number"
                                value={receiverAccountNumber}
                                onChange={(e) => setReceiverAccountNumber(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Branch / District (Optional)</Label>
                              <Input 
                                placeholder="Branch / District"
                                value={receiverBranch}
                                onChange={(e) => setReceiverBranch(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* INDIA */}
                    {receiverCountry === 'India' && (
                      <div className="space-y-4">
                        {accountType === 'UPI' && (
                          <>
                            <div className="space-y-2">
                              <Label>Holder Name</Label>
                              <Input 
                                placeholder="Full Name of the Holder"
                                value={receiverName}
                                onChange={(e) => setReceiverName(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>UPI ID</Label>
                              <Input 
                                placeholder="example@upi"
                                value={receiverAccountNumber}
                                onChange={(e) => setReceiverAccountNumber(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                          </>
                        )}
                        {['IMPS', 'Bank Transfer'].includes(accountType) && (
                          <>
                            <div className="space-y-2">
                              <Label>Holder Name</Label>
                              <Input 
                                placeholder="Full Name of the Holder"
                                value={receiverName}
                                onChange={(e) => setReceiverName(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Bank Name</Label>
                              <Input 
                                placeholder="Bank Name"
                                value={receiverBankName}
                                onChange={(e) => setReceiverBankName(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Bank Account Number</Label>
                              <Input 
                                placeholder="Account Number"
                                value={receiverAccountNumber}
                                onChange={(e) => setReceiverAccountNumber(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>IFSC Code</Label>
                                <Input 
                                  placeholder="IFSC Code"
                                  value={receiverIfsc}
                                  onChange={(e) => setReceiverIfsc(e.target.value)}
                                  className="bg-white/5 border-white/10 h-12 rounded-xl uppercase"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Account Type</Label>
                                <Select value={receiverAccountTypeSelect} onValueChange={setReceiverAccountTypeSelect}>
                                  <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="Savings">Savings</SelectItem>
                                    <SelectItem value="Current">Current</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Account Opening Branch (Optional)</Label>
                              <Input 
                                placeholder="Branch Name"
                                value={receiverBranch}
                                onChange={(e) => setReceiverBranch(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                          </>
                        )}
                        {accountType === 'Digital eRupee' && (
                          <>
                            <div className="space-y-2">
                              <Label>Digital eRupee wallet VPA</Label>
                              <Input 
                                placeholder="Digital eRupee VPA"
                                value={receiverAccountNumber}
                                onChange={(e) => setReceiverAccountNumber(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Holder Name</Label>
                              <Input 
                                placeholder="Full Name of the Holder"
                                value={receiverName}
                                onChange={(e) => setReceiverName(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                          </>
                        )}
                        {accountType === 'Paytm' && (
                          <>
                            <div className="space-y-2">
                              <Label>Holder Name</Label>
                              <Input 
                                placeholder="Full Name to match account"
                                value={receiverName}
                                onChange={(e) => setReceiverName(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Account Number</Label>
                              <Input 
                                placeholder="Paytm Account or Phone Number"
                                value={receiverAccountNumber}
                                onChange={(e) => setReceiverAccountNumber(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* PAKISTAN */}
                    {receiverCountry === 'Pakistan' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Holder Name</Label>
                          <Input 
                            placeholder="Account Holder Name"
                            value={receiverName}
                            onChange={(e) => setReceiverName(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Number</Label>
                          <Input 
                            placeholder="Account or Wallet Number"
                            value={receiverAccountNumber}
                            onChange={(e) => setReceiverAccountNumber(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 rounded-xl"
                          />
                        </div>
                        {accountType === 'Easypaisa-PK Only' && (
                          <div className="space-y-2">
                            <Label>Other payment details (Optional)</Label>
                            <Input 
                              placeholder="For international transfer etc."
                              value={otherDetails}
                              onChange={(e) => setOtherDetails(e.target.value)}
                              className="bg-white/5 border-white/10 h-12 rounded-xl"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* NEPAL */}
                    {receiverCountry === 'Nepal' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Holder Name</Label>
                          <Input 
                            placeholder="Holder Name"
                            value={receiverName}
                            onChange={(e) => setReceiverName(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{accountType === 'IME Pay' ? 'IMEpay Mobile Number' : 'Phone Number'}</Label>
                          <Input 
                            placeholder="Mobile Number"
                            value={receiverPhone}
                            onChange={(e) => setReceiverPhone(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 rounded-xl"
                          />
                        </div>
                        {accountType === 'Esewa' && (
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input 
                              placeholder="Email Address"
                              value={receiverEmail}
                              onChange={(e) => setReceiverEmail(e.target.value)}
                              className="bg-white/5 border-white/10 h-12 rounded-xl"
                            />
                          </div>
                        )}
                        {['Esewa'].includes(accountType) && (
                          <div className="space-y-2">
                            <Label>Note (Optional)</Label>
                            <Input 
                              placeholder="Any additional notes"
                              value={receiverNote}
                              onChange={(e) => setReceiverNote(e.target.value)}
                              className="bg-white/5 border-white/10 h-12 rounded-xl"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* VIETNAM */}
                    {receiverCountry === 'Vietnam' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Receiver Name</Label>
                          <Input 
                            value={receiverName}
                            onChange={(e) => setReceiverName(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Number</Label>
                          <Input 
                            value={receiverAccountNumber}
                            onChange={(e) => setReceiverAccountNumber(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Bank/Wallet Name</Label>
                          <Input 
                            value={receiverBankName}
                            onChange={(e) => setReceiverBankName(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 rounded-xl"
                          />
                        </div>
                      </div>
                    )}

                    {/* QR Code Upload - Common for many */}
                    <div className="space-y-2">
                      <Label className="text-slate-400">QR Code Photo (Optional)</Label>
                      <div 
                        className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-brand-blue/50 transition-colors cursor-pointer"
                        onClick={() => document.getElementById('qr-upload')?.click()}
                      >
                        <input 
                          id="qr-upload" 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => setReceiverQrFile(e.target.files?.[0] || null)}
                        />
                        {receiverQrFile ? (
                          <div className="flex items-center justify-center gap-2 text-brand-blue">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-bold">{receiverQrFile.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <QrCode className="w-6 h-6 text-slate-500" />
                            <span className="text-xs text-slate-500 font-bold tracking-widest uppercase">Upload QR Photo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-14 rounded-2xl border border-white/10">Back</Button>
                    <Button onClick={handleNext} className="flex-[2] h-14 bg-brand-blue hover:bg-blue-500 text-white rounded-2xl font-bold">Review Details</Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">Review Details</h3>
                    <p className="text-sm text-slate-400">Please confirm the transfer information below.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-left">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Exchange Amount</p>
                        <p className="text-xl font-bold font-display">{amount} {sourceCurrency}</p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-slate-600 self-center" />
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Receiver Gets</p>
                        <p className="text-xl font-bold text-brand-blue font-display">{targetAmount} {targetCurrency}</p>
                      </div>
                    </div>

                      <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4 shadow-xl">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Country</span>
                          <span className="font-bold">{receiverCountry}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Account Type</span>
                          <span className="font-bold text-brand-blue">{accountType}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Receiver / Holder Details</span>
                          <div className="text-right">
                            <p className="font-bold">{receiverName}</p>
                            <p className="text-xs text-slate-500">{receiverAccountNumber}</p>
                          </div>
                        </div>
                        {receiverBankName && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Bank Name</span>
                            <span className="font-bold">{receiverBankName}</span>
                          </div>
                        )}
                        {receiverIfsc && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">IFSC Code</span>
                            <span className="font-bold uppercase">{receiverIfsc}</span>
                          </div>
                        )}
                        {receiverEmail && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Email</span>
                            <span className="font-bold">{receiverEmail}</span>
                          </div>
                        )}
                        {receiverPhone && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Phone</span>
                            <span className="font-bold">{receiverPhone}</span>
                          </div>
                        )}
                        {receiverBranch && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Branch</span>
                            <span className="font-bold">{receiverBranch}</span>
                          </div>
                        )}
                        {receiverAccountTypeSelect && ['IMPS', 'Bank Transfer'].includes(accountType) && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Account Type</span>
                            <span className="font-bold">{receiverAccountTypeSelect}</span>
                          </div>
                        )}
                        {otherDetails && (
                          <div className="flex flex-col gap-1 text-sm border-t border-white/5 pt-2">
                            <span className="text-slate-400">Other Details</span>
                            <p className="text-xs text-slate-300 italic">{otherDetails}</p>
                          </div>
                        )}
                        {receiverNote && (
                          <div className="flex flex-col gap-1 text-sm border-t border-white/5 pt-2">
                            <span className="text-slate-400">Note</span>
                            <p className="text-xs text-slate-300 italic">{receiverNote}</p>
                          </div>
                        )}
                        <div className="pt-4 border-t border-white/5 flex justify-between text-sm font-bold">
                          <span className="text-slate-400">Service Fee</span>
                          <span className="flex items-center gap-1">
                            <Calculator className="w-3 h-3 text-brand-blue" />
                            {fee.toLocaleString()} {sourceCurrency}
                          </span>
                        </div>
                      </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 h-14 rounded-2xl border border-white/10">Back</Button>
                    <Button 
                      onClick={() => setShowPasswordStep(true)} 
                      className="flex-[2] h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/20"
                    >
                      Confirm Exchange
                    </Button>
                  </div>

                  {/* Password Verification Modal */}
                  <AnimatePresence>
                    {showPasswordStep && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowPasswordStep(false)}
                          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 20 }}
                          className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl"
                        >
                          <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <Lock className="w-6 h-6 text-brand-blue" />
                            </div>
                            <h3 className="text-xl font-bold">Verify Identity</h3>
                            <p className="text-xs text-slate-500 mt-1">Enter your password to authorize this transfer</p>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Password</Label>
                              <Input 
                                type="password" 
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                                autoFocus
                              />
                            </div>
                            <Button 
                              onClick={handleSend}
                              disabled={isSubmitting || !password}
                              className="w-full h-12 bg-brand-blue hover:bg-blue-500 text-white rounded-xl font-bold"
                            >
                              {isSubmitting ? 'Verifying...' : 'Confirm Transfer'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => setShowPasswordStep(false)}
                              className="w-full h-12 text-slate-500"
                            >
                              Cancel
                            </Button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-dark border-white/5 rounded-3xl p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg font-display font-bold flex items-center gap-2">
                <Info className="w-5 h-5 text-brand-blue" />
                Transfer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-500">1</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Transfers to South Asia (India, Pakistan, Bangladesh) usually take less than 1 hour.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-500">2</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    We use mid-market exchange rates with a transparent 1% service fee.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-500">3</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your money is protected by AES-256 bank-grade encryption and multi-factor authentication.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              Important Notice
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Please ensure the receiver's details are correct. International transfers cannot be reversed once completed.
            </p>
          </div>
        </div>
      </div>

      {/* Pop-up Warning */}
      <AnimatePresence>
        {showInitialWarning && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowInitialWarning(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0d1117] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-display font-black uppercase tracking-tighter text-white">{t('warning')}</h3>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">
                    {t('exchange_warning_message')}
                  </p>
                </div>
                <Button 
                  onClick={() => setShowInitialWarning(false)}
                  className="w-full h-14 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20"
                >
                  {t('i_agree')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
