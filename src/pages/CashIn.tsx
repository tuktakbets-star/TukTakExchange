import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { firebaseService } from '../lib/firebaseService';
import { where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
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
  const [amountBDT, setAmountBDT] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [transactionCode, setTransactionCode] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubRates = firebaseService.subscribeToCollection('rates', [], (data) => {
      setRates(data);
    });

    const unsubSettings = firebaseService.subscribeToCollection('adminSettings', [], (data) => {
      // Look for the specific key, but fallback to any setting with value if only one exists (defensive)
      const ciSettings = data.find(s => s.key === 'cash_in_settings') || 
                        data.find(s => s.key === 'deposit_info') ||
                        (data.length === 1 ? data[0] : null);
      
      if (ciSettings?.value) {
        setAdminSettings(ciSettings.value);
      }
    });

    return () => {
      unsubRates();
      unsubSettings();
    };
  }, []);

  // Assuming 1 VND = X BDT in the rates table
  const bdtRate = rates.find(r => r.target === 'BDT')?.rate || 0.0034;
  const receiveVND = amountBDT ? (Number(amountBDT) / bdtRate).toFixed(0) : '0';

  const handleNext = () => {
    if (step === 1) {
      if (!amountBDT || Number(amountBDT) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (!proofFile) {
        toast.error('Please provide payment proof');
        return;
      }
      setStep(4);
    }
  };

  const handleConfirm = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      const realProofUrl = await firebaseService.uploadFile(proofFile);
      const tx = {
        uid: profile?.uid,
        type: 'cash_in',
        status: 'pending',
        amount: Number(receiveVND),
        currency: 'VND',
        sourceAmount: Number(amountBDT),
        sourceCurrency: 'BDT',
        proofUrl: realProofUrl,
        transactionCode: transactionCode || null,
        createdAt: new Date().toISOString(),
        description: `Cash In ${amountBDT} BDT`
      };

      const docId = await firebaseService.addDocument('transactions', tx);
      toast.success('Cash In request submitted!');
      navigate(`/waiting/${docId}`);
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
        <p className="text-slate-400 max-w-md mx-auto">{t('cash_in_desc')}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
              step >= i ? "bg-green-600 text-white shadow-lg shadow-green-600/20" : "bg-white/5 text-slate-500 border border-white/10"
            )}>
              {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
            </div>
            {i < 4 && <div className={cn("w-8 h-0.5 mx-1", step > i ? "bg-green-600" : "bg-white/5")} />}
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
                <div className="flex items-center gap-2 text-green-500 font-bold mb-4">
                  <Calculator className="w-5 h-5" />
                  <h3>{t('cash_in_calc')}</h3>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">{t('amount_bdt')}</Label>
                    <div className="relative">
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={amountBDT}
                        onChange={(e) => setAmountBDT(e.target.value)}
                        className="h-14 bg-white/5 border-white/10 text-2xl font-display font-bold rounded-2xl pl-12"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
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
                      ₫ {receiveVND.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-3 items-start">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('current_rate')}: 1 BDT = {(1/bdtRate).toFixed(2)} VND. This rate is set by admin for easy conversion.
                  </p>
                </div>

                <Button onClick={handleNext} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-600/20 transition-all">
                  {t('cashIn')} <ChevronRight className="ml-2 w-5 h-5" />
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
                  <h3>{t('admin_bank_details')}</h3>
                </div>

                <div className="space-y-4">
                  {adminSettings ? (
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">RECEIVING AGENT (BANGLADESH)</p>
                          <h4 className="text-lg font-bold text-white">{adminSettings.bankName}</h4>
                        </div>
                        <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-brand-blue" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t('account_number')}</p>
                          <p className="font-mono text-white text-base">{adminSettings.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t('account_holder')}</p>
                          <p className="text-white text-base font-bold">{adminSettings.accountHolder}</p>
                        </div>
                      </div>
                      {adminSettings.qrCode && (
                        <div className="pt-2">
                           <div className="aspect-square bg-slate-950 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden mb-2">
                              <img src={adminSettings.qrCode} alt="QR" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                           </div>
                           <p className="text-[10px] text-center text-slate-500 uppercase font-black">Scan to Pay (Bkash/Nagad/Rocket)</p>
                        </div>
                      )}
                      {adminSettings.instructions && (
                        <div className="pt-4 mt-4 border-t border-white/5">
                          <Label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Instructions</Label>
                          <p className="text-xs text-slate-400 whitespace-pre-line">{adminSettings.instructions}</p>
                        </div>
                      )}
                      {adminSettings.terms && (
                        <div className="pt-4 mt-4 border-t border-red-500/10">
                          <Label className="text-[10px] text-red-500 uppercase tracking-widest mb-1 block">Terms & Conditions</Label>
                          <p className="text-[10px] text-slate-500 italic whitespace-pre-line">{adminSettings.terms}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl">
                       <p className="text-slate-400">Admin hasn't configured Bangladesh bank accounts yet.</p>
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
