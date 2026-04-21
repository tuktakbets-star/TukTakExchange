import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { firebaseService } from '../lib/firebaseService';
import { where } from 'firebase/firestore';
import { 
  Send, 
  ArrowRight, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  User,
  Globe,
  Lock,
  Upload,
  FileText,
  Building2,
  QrCode,
  ChevronRight
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
import { motion, AnimatePresence } from 'motion/react';

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
  const [amount, setAmount] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverBankName, setReceiverBankName] = useState('');
  const [receiverAccountNumber, setReceiverAccountNumber] = useState('');
  const [receiverBranch, setReceiverBranch] = useState('');
  const [receiverQrFile, setReceiverQrFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordStep, setShowPasswordStep] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;

    const unsubWallets = firebaseService.subscribeToCollection(
      'wallets',
      [where('uid', '==', profile.uid)],
      (data) => setWallets(data)
    );

    const unsubRates = firebaseService.subscribeToCollection(
      'rates',
      [],
      (data) => setRates(data)
    );

    return () => {
      unsubWallets();
      unsubRates();
    };
  }, [profile?.uid]);

  // Fix: The rates collection uses 'target' as the key and base is always VND
  const currentRate = rates.find(r => r.target === targetCurrency)?.rate || 0.0034;
  const targetAmount = amount ? (Number(amount) * currentRate).toFixed(2) : '0.00';
  const fee = amount ? (Number(amount) * 0.01).toFixed(0) : '0'; // 1% fee

  const handleNext = () => {
    if (step === 1) {
      if (!amount || Number(amount) <= 0) {
        toast.error('Please enter a valid amount');
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
      if (!receiverBankName || !receiverAccountNumber || !receiverName) {
        toast.error('Please fill in bank and receiver details');
        return;
      }
      setStep(3);
    }
  };

  const handleSend = async () => {
    if (!password) {
      toast.error('Please enter your password to confirm');
      return;
    }
    
    setIsSubmitting(true);
    try {
      let qrUrl = null;
      if (receiverQrFile) {
        qrUrl = await firebaseService.uploadFile(receiverQrFile);
      }

      const tx = {
        uid: profile?.uid,
        type: 'exchange',
        status: 'pending',
        amount: Number(amount),
        currency: sourceCurrency,
        targetAmount: Number(targetAmount),
        targetCurrency: targetCurrency,
        fee: Number(fee),
        totalToDeduct: Number(amount) + Number(fee),
        receiverInfo: {
          name: receiverName,
          bankName: receiverBankName,
          accountNumber: receiverAccountNumber,
          branch: receiverBranch,
          qrCode: qrUrl
        },
        description: description || `Exchange to ${receiverName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docId = await firebaseService.addDocument('transactions', tx);
      
      // Lock balance immediately (Hidden deduction)
      const wallet = wallets.find(w => w.currency === sourceCurrency);
      if (wallet) {
        await firebaseService.updateWalletBalance(profile?.uid!, sourceCurrency, 0, Number(amount) + Number(fee));
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
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <Label className="text-slate-400 text-xs uppercase tracking-wider">{t('amount')} (VND)</Label>
                      <div className="flex gap-4">
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
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
                        <div className="flex-1 text-3xl font-display font-bold py-1">
                          {targetAmount}
                        </div>
                        <Select value={targetCurrency} onValueChange={setTargetCurrency}>
                          <SelectTrigger className="w-32 bg-slate-800 border-none rounded-xl h-12 font-bold">
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
                      <span className="font-medium">1 {sourceCurrency} = {currentRate} {targetCurrency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{t('fee')} (1%)</span>
                      <span className="font-medium">{fee} {sourceCurrency}</span>
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Receiver Bank Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input 
                          placeholder="e.g. Dutch Bangla Bank, SBI, etc." 
                          value={receiverBankName}
                          onChange={(e) => setReceiverBankName(e.target.value)}
                          className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Receiver Name</Label>
                        <Input 
                          placeholder="Full Name as per Bank Account" 
                          value={receiverName}
                          onChange={(e) => setReceiverName(e.target.value)}
                          className="bg-white/5 border-white/10 h-12 rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input 
                          placeholder="Account Number" 
                          value={receiverAccountNumber}
                          onChange={(e) => setReceiverAccountNumber(e.target.value)}
                          className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Branch Name / IFSC / Routing (Optional)</Label>
                      <Input 
                        placeholder="Branch or Code" 
                        value={receiverBranch}
                        onChange={(e) => setReceiverBranch(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-400">Upload Receiver QR Code (Optional)</Label>
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
                        <span className="text-slate-400">Receiver Name</span>
                        <span className="font-bold">{receiverName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Bank Name</span>
                        <span className="font-bold">{receiverBankName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Account Number</span>
                        <span className="font-mono font-bold">{receiverAccountNumber}</span>
                      </div>
                      {receiverBranch && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Branch/IFSC</span>
                            <span className="font-bold">{receiverBranch}</span>
                        </div>
                      )}
                      <div className="pt-4 border-t border-white/5 flex justify-between text-sm font-bold">
                        <span className="text-slate-400">Service Fee (1%)</span>
                        <span>{fee} {sourceCurrency}</span>
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
    </div>
  );
}
