import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabaseService, where } from '@/lib/supabaseService';
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
  Clock,
  MessageSquare
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

export default function AddMoney() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  
  // Form states
  const [selectedCountry, setSelectedCountry] = useState('Vietnam');
  const [amountSource, setAmountSource] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubSettings = supabaseService.subscribeToCollection('adminSettings', [], (data) => {
      // Look for specific add_money_settings first, then fallback to global_settings (Vietnam section)
      const amSettings = data.find(s => s.key === 'add_money_settings');
      const globalSettings = data.find(s => s.key === 'global_settings');
      
      if (amSettings?.value) {
        setAdminSettings(amSettings.value);
      } else if (globalSettings?.value) {
        // Map global_settings fields to what AddMoney expects if needed
        setAdminSettings(globalSettings.value);
      }
    });

    return () => {
      unsubSettings();
    };
  }, []);

  const handleNext = () => {
    if (step === 1) {
      if (!amountSource || Number(amountSource) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      setStep(2);
    }
  };

  const handleConfirm = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    if (!proofFile) {
        toast.error('Please upload payment receipt');
        return;
    }

    if (!profile?.uid || !profile?.email) {
      toast.error('You must be logged in to create a transaction.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify Password first
      const { error: authError } = await supabaseService.signIn(profile.email, password);
      if (authError) {
        toast.error('Incorrect password. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const realProofUrl = await supabaseService.uploadFile(proofFile);
      const tx = {
        uid: profile.uid,
        userName: profile.displayName || profile.email?.split('@')[0],
        type: 'add_money',
        status: 'pending',
        amount: Number(amountSource),
        currency: 'VND',
        method: 'ADD_MONEY',
        paymentMethod: 'BANK_VIETNAM',
        proofUrl: realProofUrl,
        transactionCode: transactionId || null,
        createdAt: new Date().toISOString(),
        description: `Add Money ${amountSource} VND from Vietnam`
      };

      const docId = await supabaseService.addDocument('transactions', tx);
      if (docId) {
        toast.success('Add Money request submitted!');
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
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-3xl font-display font-bold">{t('addMoney')}</h1>
        <p className="text-slate-400 max-w-md mx-auto">Vietnam theke money load korun shohojei</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
              step >= i ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 text-slate-500 border border-white/10"
            )}>
              {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
            </div>
            {i < 3 && <div className={cn("w-8 h-0.5 mx-1", step > i ? "bg-blue-600" : "bg-white/5")} />}
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
                <div className="flex items-center gap-2 text-blue-500 font-bold mb-4">
                  <Calculator className="w-5 h-5" />
                  <h3>Entry Amount</h3>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">Amount (VND)</Label>
                    <div className="relative">
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={amountSource}
                        onChange={(e) => setAmountSource(e.target.value)}
                        className="h-14 bg-white/5 border-white/10 text-2xl font-display font-bold rounded-2xl pl-12"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₫</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-3 items-start">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Vietnam er local bank theke amader bank e VND pathiye screenshot upload korun.
                  </p>
                </div>

                <Button onClick={handleNext} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all">
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
                <div className="flex items-center gap-2 text-blue-500 font-bold mb-4">
                  <Building2 className="w-5 h-5" />
                  <h3>Admin Vietnam Bank Details</h3>
                </div>

                <div className="space-y-4">
                  {adminSettings ? (
                    <div className="space-y-4">
                      {/* Check if we have vietnamBanks array from AdminSettings.tsx */}
                      {Array.isArray(adminSettings.vietnamBanks) && adminSettings.vietnamBanks.length > 0 ? (
                        adminSettings.vietnamBanks.map((bank: any, idx: number) => (
                          <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">RECEIVING BANK #{idx + 1}</p>
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
                            {bank.qrUrl && (
                              <div className="pt-2">
                                <div className="aspect-square max-w-[200px] mx-auto bg-slate-950 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden mb-2">
                                  <img src={bank.qrUrl} alt="QR" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                                </div>
                                <p className="text-[10px] text-center text-slate-500 uppercase font-black">Scan to Pay</p>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        /* Fallback to legacy fields */
                        adminSettings.bankName && (
                          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">RECEIVING BANK</p>
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
                                <div className="aspect-square max-w-[200px] mx-auto bg-slate-950 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden mb-2">
                                  <img src={adminSettings.qrCode} alt="QR" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                                </div>
                                <p className="text-[10px] text-center text-slate-500 uppercase font-black">Scan to Pay</p>
                              </div>
                            )}
                          </div>
                        )
                      )}

                      {/* Display instructions and terms if they exist at the root level */}
                      {adminSettings.instructions && (
                        <div className="pt-4 mt-4 border-t border-white/5 bg-white/5 p-4 rounded-xl">
                          <Label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Instructions</Label>
                          <p className="text-xs text-slate-400 whitespace-pre-line">{adminSettings.instructions}</p>
                        </div>
                      )}
                      {adminSettings.terms && (
                        <div className="pt-4 mt-4 border-t border-red-500/10 bg-red-500/5 p-4 rounded-xl">
                          <Label className="text-[10px] text-red-500 uppercase tracking-widest mb-1 block font-bold">Terms & Conditions</Label>
                          <p className="text-[10px] text-slate-500 italic whitespace-pre-line">{adminSettings.terms}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl">
                       <p className="text-slate-400">Admin hasn't configured Vietnam bank accounts yet.</p>
                       <p className="text-xs text-slate-500 mt-2">Please contact admin via chat.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5 space-y-6">
                   <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">Upload Payment Receipt</Label>
                    <div 
                      className={cn(
                        "relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer group",
                        proofFile ? "border-blue-500/50 bg-blue-500/5" : "border-white/10 hover:border-blue-500/30 hover:bg-white/5"
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
                          proofFile ? "bg-blue-500/20 text-blue-500" : "bg-white/5 text-slate-500"
                        )}>
                          <Upload className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                          {proofFile ? (
                            <>
                              <p className="font-bold text-blue-500">{proofFile.name}</p>
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
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">Transaction ID (Optional)</Label>
                    <Input 
                      placeholder="e.g. 987654321"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
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

                <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-14 text-slate-400 rounded-2xl font-bold">
                    <ChevronLeft className="mr-2 w-5 h-5" /> {t('back')}
                  </Button>
                  <Button 
                    onClick={handleConfirm} 
                    disabled={isSubmitting || !proofFile || !password}
                    className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20"
                  >
                    {isSubmitting ? t('processing') : 'Confirm Add Money'} <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4">
         <Button 
           variant="ghost" 
           className="text-slate-400 hover:text-white"
           onClick={() => navigate('/messages')}
         >
            <MessageSquare className="w-5 h-5 mr-2 text-brand-blue" />
            Chat with Admin
         </Button>
         <Button 
           variant="ghost" 
           className="text-slate-400 hover:text-white"
           onClick={() => navigate('/dashboard')}
         >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
         </Button>
      </div>
    </div>
  );
}
