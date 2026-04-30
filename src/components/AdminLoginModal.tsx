import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Mail, ShieldAlert, Loader2, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { doc, getDoc, db } from '../lib/firebaseService';
import { useTranslation } from 'react-i18next';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user is admin in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      const adminEmails = ['tuktakbets@gmail.com', 'shohagrana284650@gmail.com', 'shohagrana28465@gmail.com', 'shohagrana84650@gmail.com', 'shohagrana4650@gmail.com', 'shohagrana650@gmail.com', 'shohagrana60@gmail.com'];
      if (userData?.role === 'admin' || adminEmails.includes(user.email || '')) {
        toast.success(t('welcomeMsg'));
        navigate('/admin-dashboard');
        onClose();
      } else {
        toast.error(t('access_denied_admin'));
        await auth.signOut();
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast.error(error.message || t('invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 blur-3xl rounded-full" />
            
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold">{t('login')}</h2>
                  <p className="text-xs text-slate-500">{t('admin_area')}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admin-email">{t('email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    id="admin-email"
                    type="email"
                    placeholder="admin@tuktak.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 h-12 rounded-xl focus:ring-red-500/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">{t('password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 h-12 rounded-xl focus:ring-red-500/50"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-600/20"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t('login')
                )}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">{t('or_continue_with')}</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline" 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await signInWithPopup(auth, googleProvider);
                    const user = result.user;
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    const userData = userDoc.data();

                    const adminEmails = ['tuktakbets@gmail.com', 'shohagrana284650@gmail.com', 'shohagrana28465@gmail.com', 'shohagrana84650@gmail.com', 'shohagrana4650@gmail.com', 'shohagrana650@gmail.com', 'shohagrana60@gmail.com'];
                    if (userData?.role === 'admin' || adminEmails.includes(user.email || '')) {
                      toast.success(t('welcomeMsg'));
                      navigate('/admin-dashboard');
                      onClose();
                    } else {
                      toast.error(t('access_denied_admin'));
                      await auth.signOut();
                    }
                  } catch (error: any) {
                    toast.error(error.message || t('google_signin_failed'));
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full h-12 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center gap-3"
              >
                <Chrome className="w-5 h-5" />
                {t('sign_in_google')}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      toast.error(t('enter_admin_email_first'));
                      return;
                    }
                    try {
                      const { sendPasswordResetEmail } = await import('firebase/auth');
                      await sendPasswordResetEmail(auth, email);
                      toast.success(t('password_reset_sent'));
                    } catch (error: any) {
                      toast.error(error.message || t('reset_link_failed'));
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                >
                  {t('forgot_password')}?
                </button>
              </div>
            </form>
            
            <p className="mt-6 text-center text-[10px] text-slate-600 uppercase tracking-widest font-bold">
              {t('unauthorizedMsg')}
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
