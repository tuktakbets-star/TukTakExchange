import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Lock, 
  Smartphone, 
  Globe, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  ToggleLeft as Toggle,
  Monitor
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function OperatorProfile() {
  const [isOnline, setIsOnline] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock profile info
  const profile = {
    username: 'operator_alpha',
    fullName: 'Junaid Ahmed',
    email: 'junaid.op@tuktaks.com',
    phone: '+880 1712 345678',
    avatar: null
  };

  const devices = [
    { id: 1, name: 'Chrome on Windows', ip: '103.114.172.95', browser: 'Chrome 123.0', time: 'Active Now', isCurrent: true },
    { id: 2, name: 'Safari on iPhone', ip: '202.4.32.11', browser: 'Safari Mobile', time: 'Last active 2 hrs ago', isCurrent: false }
  ];

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success('Password updated successfully');
      setLoading(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1500);
  };

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    toast.info(`You are now ${!isOnline ? 'Online' : 'Offline'}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <div className="flex items-center justify-between">
         <h1 className="text-3xl font-display font-black tracking-tight text-white mb-4">My Account Settings</h1>
         <div className="flex items-center gap-4">
            <span className={cn(
               "text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full",
               isOnline ? "text-green-500 bg-green-500/10" : "text-slate-500 bg-white/5"
            )}>
               Status: {isOnline ? 'Active' : 'Standby'}
            </span>
         </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Section 1: Profile Info */}
          <section className="bg-[#161b22] border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[80px] rounded-full translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-1000" />
            
            <div className="relative">
              <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-600 to-purple-600 p-[2px] shadow-2xl">
                       <div className="w-full h-full rounded-[1.95rem] bg-slate-900 flex items-center justify-center font-black text-white text-3xl">
                          {profile.username[0].toUpperCase()}
                       </div>
                    </div>
                    <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-xl transition-all active:scale-90 ring-4 ring-[#161b22]">
                      <Camera className="w-4 h-4" />
                    </button>
                 </div>
                 <div className="text-center md:text-left">
                    <h2 className="text-2xl font-black tracking-tight text-white">{profile.fullName}</h2>
                    <p className="text-blue-500 font-bold text-sm mt-1 italic">@{profile.username}</p>
                 </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                 <div className="space-y-4">
                    <div className="flex items-center gap-4 group/item">
                       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/item:bg-blue-600/10 transition-colors">
                          <Mail className="w-4 h-4 text-slate-500 group-hover/item:text-blue-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Email Address</p>
                          <p className="text-sm font-bold text-slate-200">{profile.email}</p>
                       </div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4 group/item">
                       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/item:bg-purple-600/10 transition-colors">
                          <Phone className="w-4 h-4 text-slate-500 group-hover/item:text-purple-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Phone Number</p>
                          <p className="text-sm font-bold text-slate-200">{profile.phone}</p>
                       </div>
                    </div>
                 </div>
              </div>
              
              <div className="mt-10 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
                 <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-[10px] font-bold text-amber-500 leading-tight uppercase italic">
                    Note: Your profile details are locked by Administrator. If you need to update your email or phone, please contact support.
                 </p>
              </div>
            </div>
          </section>

          {/* Section 2: Change Password */}
          <section className="bg-[#161b22] border border-white/5 rounded-[3rem] p-10">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-purple-600/10 rounded-xl flex items-center justify-center">
                   <Lock className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold font-display tracking-tight">Security Credentials</h3>
             </div>

             <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                   <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Current Password</Label>
                   <Input 
                    type="password" 
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 rounded-2xl px-6 focus:ring-purple-500 focus:border-purple-500 transition-all font-medium"
                   />
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</Label>
                      <Input 
                        type="password" 
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-12 bg-white/5 border-white/10 rounded-2xl px-6 focus:ring-purple-500 focus:border-purple-500 transition-all font-medium"
                      />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</Label>
                      <Input 
                        type="password" 
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-12 bg-white/5 border-white/10 rounded-2xl px-6 focus:ring-purple-500 focus:border-purple-500 transition-all font-medium"
                      />
                   </div>
                </div>
                <Button 
                  disabled={loading}
                  className="w-full h-14 bg-white text-slate-950 hover:bg-slate-200 rounded-2xl font-bold uppercase tracking-widest text-[11px] shadow-xl shadow-white/5"
                >
                  {loading ? 'Processing Security Update...' : 'Verify & Update Password'}
                </Button>
             </form>
          </section>
        </div>

        <div className="space-y-10">
          {/* Section 3: Online Toggle */}
          <section className="bg-[#161b22] border border-white/5 rounded-[3rem] p-10 flex flex-col items-center text-center">
             <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-500",
                isOnline ? "bg-green-500/10 text-green-500 shadow-[0_0_40px_rgba(34,197,94,0.15)] ring-4 ring-green-500/10" : "bg-slate-800 text-slate-500"
             )}>
                <Shield className={cn("w-10 h-10", isOnline && "animate-pulse")} />
             </div>
             <h3 className="text-xl font-bold font-display tracking-tight tracking-tight mb-2">Service Status</h3>
             <p className="text-xs text-slate-500 font-medium px-4 leading-relaxed mb-8">When Offline, you won't receive new order alerts and notifications.</p>
             
             <button
               onClick={handleToggleOnline}
               className={cn(
                 "relative w-20 h-10 rounded-full transition-all duration-500 p-1.5",
                 isOnline ? "bg-green-600" : "bg-slate-800"
               )}
             >
                <div className={cn(
                  "w-7 h-7 bg-white rounded-full transition-all duration-500 shadow-lg",
                  isOnline ? "translate-x-10" : "translate-x-0"
                )} />
             </button>
             <span className={cn(
               "text-[10px] font-black uppercase tracking-[0.2em] mt-4",
               isOnline ? "text-green-500" : "text-slate-500"
             )}>
                {isOnline ? 'Active for Duty' : 'Currently Offline'}
             </span>
          </section>

          {/* Section 4: Device Manager */}
          <section className="bg-[#161b22] border border-white/5 rounded-[3rem] p-10">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
                   <Monitor className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold font-display tracking-tight">Access History</h3>
             </div>

             <div className="space-y-6">
                {devices.map((device) => (
                   <div key={device.id} className="relative p-6 bg-white/5 border border-white/5 rounded-3xl group overflow-hidden">
                      {device.isCurrent && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-blue-600 text-white text-[8px] font-black uppercase italic rounded-bl-xl tracking-tighter">Current Session</div>
                      )}
                      
                      <div className="flex gap-4">
                         <Smartphone className={cn("w-6 h-6", device.isCurrent ? "text-blue-500" : "text-slate-700")} />
                         <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm tracking-tight truncate">{device.name}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{device.browser} • {device.ip}</p>
                            <p className="text-[10px] font-black text-blue-500 mt-2 uppercase italic">{device.time}</p>
                         </div>
                      </div>
                      
                      {!device.isCurrent && (
                        <button className="w-full mt-4 h-10 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100">Log out device</button>
                      )}
                   </div>
                ))}
                
                <Button variant="ghost" className="w-full text-xs font-black text-slate-500 hover:text-red-400 uppercase tracking-[0.1em]">Logout from all other devices</Button>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
