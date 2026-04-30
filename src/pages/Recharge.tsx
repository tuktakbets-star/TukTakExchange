import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { firebaseService, where } from '../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  Zap, 
  Phone, 
  Globe, 
  ArrowRight, 
  CheckCircle2,
  AlertCircle,
  Smartphone,
  CreditCard
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

export default function Recharge() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  
  // Form states
  const [country] = useState('Vietnam');
  const [operator, setOperator] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;

    const unsubWallets = firebaseService.subscribeToCollection(
      'wallets',
      [where('uid', '==', profile.uid)],
      (data) => setWallets(data)
    );

    return () => unsubWallets();
  }, [profile?.uid]);

  const operators: Record<string, string[]> = {
    Bangladesh: ['Grameenphone', 'Banglalink', 'Robi', 'Airtel', 'Teletalk'],
    Vietnam: ['Viettel', 'Vinaphone', 'Mobifone', 'Vietnamobile']
  };

  const handleNext = () => {
    if (step === 1) {
      if (!phoneNumber || !operator) {
        toast.error(t('fill_all_details'));
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!amount || Number(amount) < 20000) {
        toast.error('Minimum Recharge amount is 20,000 VND');
        return;
      }
      setStep(3);
    }
  };

  const handleRecharge = async () => {
    if (!password) {
      toast.error(t('please_enter_password'));
      return;
    }

    if (!profile?.uid || !profile?.email) {
      toast.error('You must be logged in to create a transaction.');
      return;
    }

    const wallet = wallets.find(w => w.currency === 'VND');
    if (!wallet || wallet.balance < Number(amount)) {
      toast.error(t('insufficient_balance_vnd'));
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

      const tx = {
        uid: profile?.uid,
        type: 'recharge',
        status: 'pending',
        amount: Number(amount),
        currency: 'VND',
        createdAt: new Date().toISOString(),
        description: `${t('recharge')}: ${operator} (${phoneNumber})`,
        rechargeDetails: {
          country,
          operator,
          phoneNumber
        }
      };
      
      const docId = await firebaseService.addDocument('transactions', tx);
      
      if (docId) {
        // Deduct from wallet
        await firebaseService.updateDocument('wallets', wallet.id, {
          balance: wallet.balance - Number(amount),
          updatedAt: new Date().toISOString()
        });

        toast.success(t('recharge_submitted'));
        navigate(`/waiting/${docId}`);
      } else {
        toast.error('Failed to create transaction. Please try again.');
      }
    } catch (error) {
      console.error(error);
      toast.error(t('recharge_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold mb-2">{t('recharge')}</h1>
        <p className="text-slate-400">{t('recharge_desc')}</p>
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
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-400">{t('country')}</Label>
                      <Select value={country} disabled>
                        <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl opacity-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="Vietnam">Vietnam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400">{t('operator')}</Label>
                      <Select value={operator} onValueChange={setOperator}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                          <SelectValue placeholder={t('select_operator')} />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          {operators[country].map(op => (
                            <SelectItem key={op} value={op}>{op}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400">{t('phoneNumber')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input 
                        placeholder="0XXXXXXXXX" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <Button onClick={handleNext} className="w-full h-14 bg-brand-blue hover:bg-blue-500 text-white rounded-2xl text-lg font-bold">
                    {t('continue_to_amount')}
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
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold">{operator}</p>
                        <p className="text-sm text-slate-400">{phoneNumber}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-brand-blue">{t('change')}</Button>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-slate-400">{t('select_amount_vnd')}</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {['10000', '20000', '50000', '100000', '200000', '500000'].map(val => (
                        <button
                          key={val}
                          onClick={() => setAmount(val)}
                          className={cn(
                            "h-14 rounded-xl font-bold transition-all border",
                            amount === val 
                              ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-blue-600/20" 
                              : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                          )}
                        >
                          ₫{parseInt(val).toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder={t('custom_amount')} 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-white/5 border-white/10 h-14 rounded-xl text-xl font-display font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">VND</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-14 rounded-2xl border border-white/10">{t('back')}</Button>
                    <Button 
                      onClick={handleNext} 
                      disabled={!amount}
                      className="flex-[2] h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/20"
                    >
                      {t('continue')}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-6"
                >
                   <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">{t('operator')}</span>
                        <span className="font-bold">{operator}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">{t('phoneNumber')}</span>
                        <span className="font-mono">{phoneNumber}</span>
                      </div>
                      <div className="h-px bg-white/5" />
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">{t('amount')}</span>
                        <span className="text-2xl font-display font-bold text-brand-blue">₫{parseInt(amount).toLocaleString()}</span>
                      </div>
                   </div>

                   <div className="space-y-2 text-center">
                     <Label className="text-slate-400">{t('transaction_password')}</Label>
                     <Input 
                        type="password" 
                        placeholder="••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-white/5 border-white/10 h-16 rounded-2xl text-center text-3xl tracking-[0.5em] font-mono"
                     />
                   </div>

                   <div className="flex gap-4 pt-4">
                    <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 h-14 rounded-2xl border border-white/10">{t('back')}</Button>
                    <Button 
                      onClick={handleRecharge} 
                      disabled={isSubmitting || !password}
                      className="flex-[2] h-14 bg-gradient-to-r from-blue-600 to-brand-blue hover:from-blue-500 hover:to-brand-blue text-white rounded-2xl font-bold shadow-xl shadow-blue-600/20"
                    >
                      {isSubmitting ? t('processing') : t('confirm_recharge')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-dark border-white/5 rounded-3xl p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg font-display font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-blue" />
                {t('payment_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">{t('vnd_wallet_balance')}</p>
                <p className="text-2xl font-display font-bold">
                  ₫{wallets.find(w => w.currency === 'VND')?.balance.toLocaleString() || 0}
                </p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('recharge_info_desc')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
