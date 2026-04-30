import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabaseService, where } from '../lib/supabaseService';
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
    const mode = searchParams.get('mode');
    if (user && mode !== 'register') {
      if (defaultAdminMode) {
        if (isAdmin) {
          navigate('/admin-dashboard', { replace: true });
        }
      } else {
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

        const cleanEmail = email.toLowerCase().trim();
        const cleanPhone = phoneNumber.trim();
        const cleanPassport = passportNumber.trim();

        // 1. Check for uniqueness manually (or rely on Supabase uniqueness constraints if set up)
        const checkEmail = await supabaseService.getCollection('users', [
          where('email', '==', cleanEmail)
        ]);
        if (checkEmail.length > 0) {
          toast.error('Email already in use');
          setLoading(false);
          return;
        }

        if (cleanPhone) {
          const checkPhone = await supabaseService.getCollection('users', [
            where('phoneNumber', '==', cleanPhone)
          ]);
          if (checkPhone.length > 0) {
            toast.error('Phone number already associated with another account');
            setLoading(false);
            return;
          }
        }

        if (cleanPassport) {
          const checkPassport = await supabaseService.getCollection('users', [
            where('passportNumber', '==', cleanPassport)
          ]);
          if (checkPassport.length > 0) {
            toast.error('Passport number already associated with another account');
            setLoading(false);
            return;
          }
        }

        // 2. Supabase Sign Up
        const { data, error } = await supabaseService.signUp(email, password, {
          data: {
            full_name: fullName,
          }
        });

        if (error) throw error;
        if (!data.user) throw new Error("Registration failed");

        const sbUser = data.user;

        // Process files to Base64
        const [passportBase64, selfieBase64] = await Promise.all([
          toBase64(passportPhoto),
          toBase64(selfie)
        ]);
        
        // Save user data to Supabase table
        const userProfile = {
          uid: sbUser.id,
          email: cleanEmail,
          displayName: fullName,
          phoneNumber: cleanPhone,
          accountNumber: cleanPhone,
          passportNumber: cleanPassport,
          referralCode: referralCode.trim(),
          role: 'client',
          status: 'active',
          kycStatus: 'submitted',
          kycData: {
            passportUrl: passportBase64,
            selfieUrl: selfieBase64,
            submittedAt: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await supabaseService.setDocument('users', sbUser.id, userProfile);

        // KYC Tracking
        await supabaseService.addDocument('kycSubmissions', {
          uid: sbUser.id,
          userEmail: cleanEmail,
          userName: fullName,
          passportNumber: cleanPassport,
          passportUrl: passportBase64,
          selfieUrl: selfieBase64,
          status: 'pending',
          submittedAt: new Date().toISOString()
        });

        // Initialize wallets
        const currencies = ['VND', 'BDT', 'USD'];
        await Promise.all(currencies.map(currency => 
          supabaseService.setDocument('wallets', `${sbUser.id}_${currency}`, {
            uid: sbUser.id,
            currency,
            balance: 0,
            updatedAt: new Date().toISOString()
          })
        ));

        // Create initial notification
        await supabaseService.addDocument('notifications', {
          uid: sbUser.id,
          title: 'Welcome to Tuktak Exchange',
          message: 'Your account has been created successfully. Your profile is currently pending verification.',
          type: 'system',
          read: false,
          createdAt: new Date().toISOString()
        });
        
        toast.success(t('register_success'));
      } else {
        // LOGIN MODE
        const { data, error } = await supabaseService.signIn(email, password);
        if (error) throw error;
        
        const sbUser = data.user;
        if (!sbUser) throw new Error("Login failed");

        // Fetch profile to check session
        const { data: userData } = await supabaseService.getDocument('users', sbUser.id);
        
        // --- Multi-device Session Management ---
        const localSessionId = sessionStorage.getItem('sessionId');
        
        if (userData?.sessionStatus === 'active' && userData?.currentSessionId !== localSessionId) {
          // Another session is active. Create a login request.
          const requestId = await supabaseService.addDocument('login_requests', {
            uid: sbUser.id,
            email: sbUser.email,
            device_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              timestamp: new Date().toISOString()
            },
            status: 'pending'
          });

          if (!requestId) throw new Error("Failed to create login request");

          // Display "Waiting for approval" state
          setLoading(true);
          toast.info("Active session detected. Please approve this login from your other device.");
          
          // Poll for approval status
          const checkApproval = setInterval(async () => {
            const { data: req } = await supabaseService.getDocument('login_requests', requestId);
            if (req?.status === 'approved') {
              clearInterval(checkApproval);
              
              // Proceed with login
              await supabaseService.updateDocument('users', sbUser.id, {
                currentSessionId: localSessionId,
                sessionStatus: 'active',
                lastActiveAt: new Date().toISOString()
              });
              
              toast.success(t('login_success'));
              finalizeLogin(sbUser, userData);
            } else if (req?.status === 'rejected') {
              clearInterval(checkApproval);
              setLoading(false);
              toast.error("Login request rejected by the other device.");
              await supabaseService.signOut();
            }
          }, 3000);

          // Timeout after 2 minutes
          setTimeout(() => {
            clearInterval(checkApproval);
            setLoading(false);
            if (loading) toast.error("Login request timed out.");
          }, 120000);

          return;
        }

        // No active session or same session, just update and proceed
        await supabaseService.updateDocument('users', sbUser.id, {
          currentSessionId: localSessionId,
          sessionStatus: 'active',
          lastActiveAt: new Date().toISOString()
        });
        
        toast.success(t('login_success'));
        finalizeLogin(sbUser, userData);
        return;
      }
      // Remove redundant navigation if already handled
    } catch (error: any) {
      console.error(error);
      const msg = error.message || t('auth_failed');
      if (msg.includes('already registered')) {
        toast.error(t('email_already_in_use'));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const finalizeLogin = (sbUser: any, userData: any) => {
    if (defaultAdminMode) {
      const adminEmails = [
        'tuktakbets@gmail.com', 
        'shohagrana284650@gmail.com', 
        'shohagrana28465@gmail.com',
        'shohagrana84650@gmail.com', 
        'shohagrana4650@gmail.com', 
        'shohagrana650@gmail.com', 
        'shohagrana60@gmail.com'
      ];
      if (userData?.role === 'admin' || adminEmails.includes(sbUser.email || '')) {
        navigate('/admin-dashboard', { replace: true });
      } else {
        toast.error(t('access_denied_admin'));
        supabaseService.signOut();
      }
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabaseService.signInWithGoogle();
      if (error) throw error;
      // Redirect happens via Supabase
    } catch (error: any) {
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
