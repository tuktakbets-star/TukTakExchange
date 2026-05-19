import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabaseService, where } from '../lib/supabaseService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Search, 
  User, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Lock,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2
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

export default function SendMoney() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  
  // Form states
  const [receiverId, setReceiverId] = useState('');
  const [receiverProfile, setReceiverProfile] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = supabaseService.subscribeToCollection(
      'wallets',
      [where('uid', '==', profile.uid), where('currency', '==', 'VND')],
      (data) => setWallet(data[0])
    );
    return () => unsub();
  }, [profile?.uid]);

  const verifyReceiver = async () => {
    const id = receiverId.trim();
    if (!id) return;
    setLoading(true);
    setReceiverProfile(null);
    try {
      // Search by accountNumber (which is the phone number) in users collection
      const usersByAccount = await supabaseService.getCollection('users', [where('accountNumber', '==', id)]);
      let users = usersByAccount;

      // Fallback to phoneNumber if not found by accountNumber
      if (users.length === 0) {
        users = await supabaseService.getCollection('users', [where('phoneNumber', '==', id)]);
      }
      
      if (users.length > 0) {
        const user = users[0] as any;
        if (user.uid === profile?.uid) {
          toast.error("You cannot send money to yourself");
          return;
        }
        setReceiverProfile(user);
        toast.success(t('receiver_verified'));
      } else {
        toast.error(t('invalid_user'));
      }
    } catch (error) {
      console.error(error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!receiverProfile) {
        toast.error('Please verify receiver first');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!amount || Number(amount) < 10000) {
        toast.error('Minimum sending amount is 10,000 VND');
        return;
      }
      if (Number(amount) > (wallet?.balance || 0)) {
        toast.error(t('insufficient_balance_vnd'));
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

    if (!profile?.uid || !profile?.email) {
      toast.error('You must be logged in to create a transaction.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 0. Verify Password first
      const { error: authError } = await supabaseService.signIn(profile.email, password);
      if (authError) {
        toast.error('Incorrect password. Please try again.');
        setIsSubmitting(false);
        return;
      }
      
      // Get receiver wallet
      const receiverWallets = await supabaseService.getCollection('wallets', [
        where('uid', '==', receiverProfile.uid),
        where('currency', '==', 'VND')
      ]);

      if (receiverWallets.length === 0) {
        toast.error("Receiver does not have a VND wallet. They must log in once to initialize it.");
        setIsSubmitting(false);
        return;
      }

      const amountNum = Number(amount);
      const senderWalletId = wallet.id;
      const receiverWalletId = receiverWallets[0].id;

      // Use sequential updates for Supabase (Atomicity can be handled via RPC if needed, but this is simpler for now)
      // 1. Deduct from sender
      const { success: senderSuccess } = await supabaseService.updateDocument('wallets', senderWalletId, {
        balance: (wallet.balance || 0) - amountNum,
        updatedAt: new Date().toISOString()
      });

      if (!senderSuccess) throw new Error("Failed to update sender wallet");

      // 2. Add to receiver
      const { success: receiverSuccess } = await supabaseService.updateDocument('wallets', receiverWalletId, {
        balance: (receiverWallets[0].balance || 0) + amountNum,
        updatedAt: new Date().toISOString()
      });

      if (!receiverSuccess) {
        // Rollback sender if receiver fails
        await supabaseService.updateDocument('wallets', senderWalletId, {
          balance: wallet.balance || 0,
          updatedAt: new Date().toISOString()
        });
        throw new Error("Failed to update receiver wallet. Transaction rolled back.");
      }

      // 3. Add transaction records
      const senderTx = {
        uid: profile?.uid,
        user_name: profile?.full_name || profile?.displayName || "Customer",
        type: 'send',
        status: 'completed',
        amount: amountNum,
        currency: 'VND',
        receiverId: receiverProfile.uid,
        receiverName: receiverProfile.displayName || 'Tuktak User',
        receiverPhone: receiverProfile.phoneNumber,
        createdAt: new Date().toISOString(),
        description: `Internal Transfer to ${receiverProfile.displayName || receiverProfile.phoneNumber}`
      };
      
      const docId = await supabaseService.addDocument('transactions', senderTx);

      await supabaseService.addDocument('transactions', {
        uid: receiverProfile.uid,
        user_name: receiverProfile.displayName || "Customer",
        type: 'receive',
        status: 'completed',
        amount: amountNum,
        currency: 'VND',
        senderId: profile?.uid,
        senderName: profile?.displayName || 'Tuktak User',
        senderPhone: profile?.phoneNumber,
        createdAt: new Date().toISOString(),
        description: `Internal Transfer from ${profile?.displayName || profile?.phoneNumber}`
      });

      // --- SEND TELEGRAM NOTIFICATION DISABLED (Handled by Webhook) ---
      
      toast.success(t('p2p_transfer_success'));
      navigate('/wallet');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('p2p_transfer_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-4 pt-8">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-12">
          <Send className="w-10 h-10 text-blue-500 -rotate-12" />
        </div>
        <h1 className="text-3xl font-display font-bold">Transfer Money</h1>
        <p className="text-slate-400 max-w-md mx-auto">Transfer VND instantly to any Tuktak Exchange account using their phone number.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
              step >= i ? "bg-brand-blue text-white shadow-lg shadow-blue-600/20" : "bg-white/5 text-slate-500 border border-white/10"
            )}>
              {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
            </div>
            {i < 3 && <div className={cn("w-8 h-0.5 mx-1", step > i ? "bg-brand-blue" : "bg-white/5")} />}
          </div>
        ))}
      </div>

      <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/10">
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
                  <User className="w-5 h-5" />
                  <h3>Verify Recipient</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-bold">Recipient Account Number (Phone)</Label>
                    <div className="relative">
                      <Input 
                        placeholder="e.g. +84 123 456 789"
                        value={receiverId}
                        onChange={(e) => {
                          setReceiverId(e.target.value);
                          if (receiverProfile) setReceiverProfile(null);
                        }}
                        className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 pr-24 focus:border-brand-blue transition-all"
                      />
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <Button 
                        onClick={verifyReceiver} 
                        disabled={loading || !receiverId}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue rounded-xl text-xs font-bold px-4 flex items-center gap-2"
                      >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {loading ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                  </div>

                  {receiverProfile ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 rounded-3xl bg-green-500/5 border border-green-500/20 flex items-center gap-4"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                        <User className="w-8 h-8 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mb-1">Account Holder Name</p>
                        <h4 className="text-xl font-bold text-white">{receiverProfile.displayName || 'Tuktak User'}</h4>
                        <p className="text-xs text-slate-500">{receiverProfile.phoneNumber}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </motion.div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-slate-600 italic text-sm">
                      Enter the receiver's phone number above to confirm their identity.
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleNext} 
                  disabled={!receiverProfile}
                  className="w-full h-14 bg-brand-blue hover:bg-blue-600 text-white rounded-2xl font-bold transition-all disabled:opacity-50"
                >
                  Step 2: Enter Amount <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sending To</p>
                    <p className="font-bold text-white">{receiverProfile.displayName}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4 text-center">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest">Enter Amount (VND)</Label>
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-4xl font-display font-medium text-slate-500">₫</span>
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-20 bg-transparent border-none text-6xl font-display font-bold text-white text-center w-full focus-visible:ring-0 p-0"
                      />
                    </div>
                    <div className="p-3 inline-flex bg-white/5 rounded-2xl border border-white/5">
                       <p className="text-xs text-slate-400">
                         {t('totalBalance')}: <span className="text-white font-bold">₫{wallet?.balance?.toLocaleString() || 0}</span>
                       </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-14 text-slate-400 rounded-2xl font-bold">
                    <ChevronLeft className="mr-2 w-5 h-5" /> Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1 h-14 bg-brand-blue hover:bg-blue-600 text-white rounded-2xl font-bold transition-all">
                    Step 3: Password <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-8 text-center"
              >
                <div className="w-24 h-24 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto relative">
                   <Lock className="w-12 h-12 text-brand-blue" />
                   <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 border-2 border-dashed border-brand-blue rounded-full border-spacing-4" 
                   />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold text-white">Security Confirmation</h3>
                  <p className="text-slate-400">Please enter your account password to authorize the transfer of <span className="text-green-400 font-bold">₫{Number(amount).toLocaleString()}</span> to <span className="text-white font-bold">{receiverProfile.displayName}</span></p>
                </div>

                <div className="max-w-xs mx-auto space-y-4 text-left">
                  <Input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-16 bg-white/5 border-white/10 text-center text-3xl tracking-[0.4em] rounded-2xl focus:border-brand-blue transition-all"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 h-14 text-slate-400 rounded-2xl font-bold">
                    {t('cancel')}
                  </Button>
                  <Button 
                    onClick={handleSend} 
                    disabled={isSubmitting || !password}
                    className="flex-1 h-14 bg-brand-blue hover:bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20"
                  >
                    {isSubmitting ? 'Sending...' : 'Confirm & Send Money'}
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
