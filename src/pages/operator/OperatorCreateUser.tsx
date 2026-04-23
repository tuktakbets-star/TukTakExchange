import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/hooks/useAuth';
import { firebaseService } from '@/lib/firebaseService';
import { operatorService } from '@/lib/operatorService';
import { 
  UserPlus, 
  Mail, 
  Phone, 
  User, 
  Globe, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCcw,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function OperatorCreateUser() {
  const { user: operator } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Vietnam');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator) return;
    setLoading(true);

    try {
      // 1. Create firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // 2. Create profile
      const profileData = {
        uid: newUser.uid,
        displayName: name,
        email: email,
        phoneNumber: phone,
        country: country,
        role: 'user',
        status: 'active',
        kycStatus: 'none',
        createdAt: new Date().toISOString()
      };

      await firebaseService.setDocument('users', newUser.uid, profileData);

      // 3. Create initial wallets
      await firebaseService.addDocument('wallets', { uid: newUser.uid, currency: 'VND', balance: 0, updatedAt: new Date().toISOString() });
      await firebaseService.addDocument('wallets', { uid: newUser.uid, currency: 'USD', balance: 0, updatedAt: new Date().toISOString() });

      // 4. Log action
      await operatorService.logAction({
        subAdminId: operator.uid,
        actionType: 'create_user',
        orderId: 'N/A',
        userId: newUser.uid,
        amount: 0,
        status: 'completed',
        timestamp: new Date().toISOString()
      });

      toast.success('User created successfully');
      setSuccess(true);
      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto"
        >
          <CheckCircle2 className="w-10 h-10" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">User Created Successfully!</h2>
          <p className="text-slate-400">The new user account is now active and ready for use.</p>
        </div>
        <Button onClick={() => setSuccess(false)} variant="outline" className="border-white/10 hover:bg-white/5">
          Create Another User
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <UserPlus className="text-blue-500" />
          Create New User
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manually register a user account. They can login with these credentials immediately.
        </p>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 sm:p-8">
        <form onSubmit={handleCreateUser} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-300">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  required 
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-950 border-white/5 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  required 
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950 border-white/5 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  required 
                  placeholder="+84 123 456 789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-950 border-white/5 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Country</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  required 
                  placeholder="Vietnam"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="bg-slate-950 border-white/5 pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  required 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950 border-white/5 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="border-white/5 bg-slate-950 hover:bg-slate-900 group"
                onClick={generatePassword}
              >
                <RefreshCcw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                Generate
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Recommended: Use a strong, unique password for every user.</p>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 shadow-lg shadow-blue-600/20"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User Account
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Security Banner */}
      <div className="bg-blue-600/5 border border-blue-600/10 rounded-2xl p-6 flex gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h3 className="text-white font-bold">Action Logging Enabled</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            This activity is being recorded. Every manual user creation is logged with your Operator ID 
            and timestamp for security audits by the main administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
