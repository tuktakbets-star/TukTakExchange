import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { firebaseService } from '../lib/firebaseService';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Mail, 
  Lock, 
  ArrowRight, 
  Chrome, 
  ShieldCheck,
  Phone,
  User,
  CheckCircle2,
  ArrowLeft,
  FileText,
  Camera,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import BackButton from '../components/BackButton';

import { useAuth } from '../hooks/useAuth';

export default function Auth({ defaultAdminMode = false }: { defaultAdminMode?: boolean }) {
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in, redirect them based on the entry mode
    // UNLESS the mode is explicitly 'register' AND we haven't just finished a successful registration
    const mode = searchParams.get('mode');
    if (user && mode !== 'register') {
      if (defaultAdminMode) {
        // Only auto-redirect if they are an admin and entered via admin login path
        if (isAdmin || ['tuktakbets@gmail.com', 'shohagrana284650@gmail.com', 'shohagrana28465@gmail.com', 'shohagrana84650@gmail.com', 'shohagrana4650@gmail.com', 'shohagrana650@gmail.com', 'shohagrana60@gmail.com'].includes(user.email || '')) {
          navigate('/admin-dashboard', { replace: true });
        }
      } else {
        // Regular entry (from Landing/Overview) -> Always go to User Panel
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isAdmin, navigate, defaultAdminMode, searchParams]);

  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(!defaultAdminMode && searchParams.get('mode') === 'register');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  // Helper to convert file to base64
  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      if (isRegister) {
        // Validation for files
        if (!passportPhoto || !selfie) {
          toast.error(t('kyc_files_required') || 'Please upload both Passport and Selfie');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: fullName,
        });

        // Process files to Base64
        const [passportBase64, selfieBase64] = await Promise.all([
          toBase64(passportPhoto),
          toBase64(selfie)
        ]);
        
        // Save user data to Firestore
        const userProfile = {
          uid: userCredential.user.uid,
          email,
          displayName: fullName,
          phoneNumber,
          accountNumber: phoneNumber, // Phone number is the account number
          passportNumber,
          referralCode,
          role: 'client',
          status: 'pending',
          kycStatus: 'pending',
          kycData: {
            passportUrl: passportBase64,
            selfieUrl: selfieBase64,
            submittedAt: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await firebaseService.setDocument('users', userCredential.user.uid, userProfile);

        // Initialize wallets for different currencies
        const currencies = ['VND', 'BDT', 'USD'];
        await Promise.all(currencies.map(currency => 
          firebaseService.setDocument('wallets', `${userCredential.user.uid}_${currency}`, {
            uid: userCredential.user.uid,
            currency,
            balance: 0,
            updatedAt: new Date().toISOString()
          })
        ));

        // Create initial notification
        await firebaseService.addDocument('notifications', {
          uid: userCredential.user.uid,
          title: 'Welcome to Tuktak Exchange',
          message: 'Your account has been created successfully. Your profile is currently pending verification.',
          type: 'system',
          read: false,
          createdAt: new Date().toISOString()
        });
        
        toast.success(t('register_success'));
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Fetch role for redirection
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        toast.success(t('login_success'));
        if (defaultAdminMode) {
          if (userData?.role === 'admin' || 
              ['tuktakbets@gmail.com', 'shohagrana284650@gmail.com', 'shohagrana28465@gmail.com', 'shohagrana84650@gmail.com', 'shohagrana4650@gmail.com', 'shohagrana650@gmail.com', 'shohagrana60@gmail.com'].includes(user.email || '')) {
            navigate('/admin-dashboard', { replace: true });
          } else {
            toast.error(t('access_denied_admin'));
            await auth.signOut();
          }
        } else {
          navigate('/dashboard', { replace: true });
        }
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError(t('email_already_in_use'));
        toast.error(t('email_already_in_use'));
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError(t('firebase_disabled_msg'));
        toast.error(t('registration_disabled'), {
          duration: 10000,
        });
      } else {
        toast.error(error.message || t('auth_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Fetch role for redirection
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      toast.success(t('google_signin_success'));
      if (defaultAdminMode) {
        if (userData?.role === 'admin' || ['tuktakbets@gmail.com', 'shohagrana284650@gmail.com', 'shohagrana28465@gmail.com'].includes(user.email || '')) {
          navigate('/admin-dashboard', { replace: true });
        } else {
          toast.error(t('access_denied_admin'));
          await auth.signOut();
        }
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error(error);
      toast.error(t('google_signin_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 lg:p-8 relative overflow-x-hidden overflow-y-auto">
      {/* Top Bar for Back Button */}
      <div className="fixed top-0 left-0 w-full p-4 z-50">
        <BackButton />
      </div>

      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10 py-4 md:py-8"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">{t('backToHome')}</span>
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/20">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
            {isRegister ? t('register_welcome') : t('login_welcome')}
          </h1>
          <p className="text-sm md:text-base text-slate-400">
            {isRegister ? t('hero_subtitle') : t('welcomeMsg')}
          </p>
        </div>

        <div className="glass-dark rounded-[2rem] p-6 md:p-8 border-white/10 shadow-2xl">
          {authError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs leading-relaxed">
              <p className="font-bold mb-1">{t('action_required')}:</p>
              {authError}
            </div>
          )}
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-300 ml-1">{t('fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    id="fullName" 
                    type="text" 
                    placeholder="John Doe" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl focus:ring-brand-blue text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 ml-1">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl focus:ring-brand-blue text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            {isRegister && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300 ml-1">{t('phoneNumber')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="+84 123 456 789" 
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl focus:ring-brand-blue text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passport" className="text-slate-300 ml-1">{t('passportNumber')}</Label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                      id="passport" 
                      type="text" 
                      placeholder="P1234567" 
                      required
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl focus:ring-brand-blue text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 ml-1">{t('passportPhoto')}</Label>
                    <label className="flex flex-col items-center justify-center h-24 w-full bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                      <Camera className="w-5 h-5 text-slate-500 mb-1" />
                      <span className="text-[10px] text-slate-400 text-center px-2">{passportPhoto ? passportPhoto.name : t('upload_photo')}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => setPassportPhoto(e.target.files?.[0] || null)} required />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 ml-1">{t('selfiePhoto')}</Label>
                    <label className="flex flex-col items-center justify-center h-24 w-full bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                      <Camera className="w-5 h-5 text-slate-500 mb-1" />
                      <span className="text-[10px] text-slate-400 text-center px-2">{selfie ? selfie.name : t('upload_selfie')}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => setSelfie(e.target.files?.[0] || null)} required />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referral" className="text-slate-300 ml-1">{t('referralCode')} (Optional)</Label>
                  <div className="relative">
                    <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                      id="referral" 
                      type="text" 
                      placeholder="REF123" 
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl focus:ring-brand-blue text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 ml-1">{t('password')}</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl focus:ring-brand-blue text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isRegister ? t('getStarted') : t('login')}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">{t('or_continue_with')}</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center gap-3"
          >
            <Chrome className="w-5 h-5" />
            {t('sign_in_google')}
          </Button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm">
            {isRegister ? t('already_have_account') : t('dont_have_account')}{' '}
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-brand-blue font-bold hover:underline"
            >
              {isRegister ? t('login') : t('register')}
            </button>
          </p>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 opacity-50 grayscale">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4" />
        </div>
      </motion.div>
    </div>
  );
}
