import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { BadgeDollarSign, Lock, User, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabaseService, where, supabase } from '../../lib/supabaseService';
import bcrypt from 'bcryptjs';

export default function OperatorLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      // 1. Check login attempts/lockout logic
      const { data: attempts } = await supabaseService.getDocument('sub_admin_login_attempts', username);
      if (attempts && attempts.locked_until && new Date(attempts.locked_until) > new Date()) {
        const remaining = Math.ceil((new Date(attempts.locked_until).getTime() - Date.now()) / (1000 * 60));
        toast.error(`Account locked. Try again in ${remaining} minutes.`);
        setLoading(false);
        return;
      }

      // 2. Fetch sub admin by username
      const { data: subAdmin, error } = await supabase
        .from('sub_admins')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01') {
          throw new Error('Database table "sub_admins" not found. Please contact main Admin to run the SQL setup.');
        }
        throw error;
      }

      if (!subAdmin) {
        throw new Error('Invalid username or password');
      }

      if (subAdmin.status !== 'active') {
        throw new Error('Account suspended. Contact admin.');
      }

      // 3. Verify password
      const isMatch = await bcrypt.compare(password, subAdmin.password);
      if (!isMatch) {
        // Handle failed attempt
        const currentAttempts = (attempts?.attempts || 0) + 1;
        if (currentAttempts >= 5) {
          const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          await supabaseService.setDocument('sub_admin_login_attempts', username, {
            attempts: 0,
            last_attempt: new Date().toISOString(),
            locked_until: lockedUntil
          });
        } else {
          await supabaseService.setDocument('sub_admin_login_attempts', username, {
            attempts: currentAttempts,
            last_attempt: new Date().toISOString()
          });
        }
        throw new Error('Invalid username or password');
      }

      // 4. Reset attempts on success
      await supabaseService.setDocument('sub_admin_login_attempts', username, {
        attempts: 0,
        last_attempt: new Date().toISOString(),
        locked_until: null
      });

      // 5. Save device info
      await supabaseService.addDocument('sub_admin_devices', {
        sub_admin_id: subAdmin.id,
        device_name: navigator.platform,
        ip_address: '127.0.0.1', // Real IP usually comes from server
        browser: navigator.userAgent,
        logged_in_at: new Date().toISOString(),
        is_current: true
      });

      // 6. Set session
      sessionStorage.setItem('operator_session', JSON.stringify({
        id: subAdmin.id,
        username: subAdmin.username,
        role: 'sub_admin',
        at: Date.now()
      }));

      toast.success('Welcome back, Operator!');
      navigate('/operator/dashboard');

    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <BadgeDollarSign className="text-white w-7 h-7" />
            </div>
            <span className="text-2xl font-display font-black tracking-tighter">
              Tuktak<span className="text-blue-500">Exchange</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Operator Login</h1>
          <p className="text-slate-500 mt-2 font-medium">Authorized personnel only</p>
        </div>

        <div className="glass-dark border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 opacity-50" />
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1">Username</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/5 border-white/10 h-14 pl-12 rounded-2xl focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 h-14 pl-12 pr-12 rounded-2xl focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 transition-all group"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Access Operator Panel"
              )}
            </Button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-3 text-amber-500">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p className="text-[10px] leading-tight font-bold uppercase tracking-tight">
              Access is monitored. Unauthorized login attempts are logged and reported.
            </p>
          </div>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="mt-8 text-slate-500 hover:text-white transition-colors text-sm font-bold flex items-center justify-center gap-2 mx-auto"
        >
          ← Back to Marketplace
        </button>
      </motion.div>
    </div>
  );
}
