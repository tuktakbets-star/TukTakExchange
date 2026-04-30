import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  Bell, 
  Lock, 
  Globe, 
  Moon, 
  Shield, 
  Smartphone,
  ChevronRight,
  LogOut,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { auth } from '../lib/firebase';
import { firebaseService } from '../lib/firebaseService';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Plus, X, Trash2 } from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState(profile?.notificationsEnabled !== false);
  const [twoFactor, setTwoFactor] = useState(profile?.twoFactorEnabled || false);
  
  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Payment Methods State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newCountry, setNewCountry] = useState('Bangladesh');
  const [isAddingPayment, setIsAddingPayment] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        toast.success('Password updated successfully');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName || !newAccountNumber) {
      toast.error('Please fill in all details');
      return;
    }

    setIsAddingPayment(true);
    try {
      const currentMethods = profile?.paymentMethods || [];
      const newMethod = {
        id: Math.random().toString(36).substr(2, 9),
        bankName: newBankName,
        accountNumber: newAccountNumber,
        country: newCountry,
        createdAt: new Date().toISOString()
      };

      await firebaseService.updateDocument('users', profile?.uid!, {
        paymentMethods: [...currentMethods, newMethod]
      });

      toast.success('Payment method added');
      setNewBankName('');
      setNewAccountNumber('');
      setShowPaymentModal(false);
    } catch (error) {
      toast.error('Failed to add payment method');
    } finally {
      setIsAddingPayment(false);
    }
  };

  const removePaymentMethod = async (id: string) => {
    try {
      const currentMethods = profile?.paymentMethods || [];
      const filtered = currentMethods.filter((m: any) => m.id !== id);
      await firebaseService.updateDocument('users', profile?.uid!, {
        paymentMethods: filtered
      });
      toast.success('Payment method removed');
    } catch (error) {
      toast.error('Failed to remove payment method');
    }
  };

  const handleToggleTwoFactor = async (checked: boolean) => {
    setTwoFactor(checked);
    if (profile?.uid) {
      try {
        await firebaseService.updateDocument('users', profile.uid, {
          twoFactorEnabled: checked
        });
        toast.success(checked ? t('two_factor_auth_active') : t('security_settings_updated'));
      } catch (error) {
        toast.error(t('settings_update_failed'));
        setTwoFactor(!checked);
      }
    }
  };

  const handleToggleNotifications = async (checked: boolean) => {
    setNotifications(checked);
    if (profile?.uid) {
      try {
        await firebaseService.updateDocument('users', profile.uid, {
          notificationsEnabled: checked
        });
        toast.success(t('notification_settings_updated'));
      } catch (error) {
        toast.error(t('settings_update_failed'));
        setNotifications(!checked);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">{t('settings')}</h1>
        <p className="text-slate-400">{t('settings_desc')}</p>
      </div>

      <div className="grid gap-6">
        {/* Account Section */}
        <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-lg font-display font-bold">{t('account_info')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-white/5">
            <div 
              className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
              onClick={() => setShowPasswordModal(true)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">{t('password')}</p>
                  <p className="text-xs text-slate-500">{t('password_last_changed')}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
            </div>

            <div 
              className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
              onClick={() => setShowPaymentModal(true)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">{t('payment_methods')}</p>
                  <p className="text-xs text-slate-500">{t('payment_methods_desc')}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-lg font-display font-bold">{t('security_privacy')}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">{t('two_factor_auth')}</p>
                  <p className="text-xs text-slate-500">{t('two_factor_auth_desc')}</p>
                </div>
              </div>
              <Switch checked={twoFactor} onCheckedChange={handleToggleTwoFactor} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">{t('device_management')}</p>
                  <p className="text-xs text-slate-500">{t('device_management_desc')}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-brand-blue">{t('manage')}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-lg font-display font-bold">{t('preferences')}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">{t('push_notifications')}</p>
                  <p className="text-xs text-slate-500">{t('push_notifications_desc')}</p>
                </div>
              </div>
              <Switch checked={notifications} onCheckedChange={handleToggleNotifications} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">{t('language')}</p>
                  <p className="text-xs text-slate-500">{t('choose_language')}</p>
                </div>
              </div>
              <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">বাংলা</SelectItem>
                  <SelectItem value="hi">हिन्दी</SelectItem>
                  <SelectItem value="ne">नेपाली</SelectItem>
                  <SelectItem value="ur">اردو</SelectItem>
                  <SelectItem value="ta">தமிழ்</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">{t('appearance')}</p>
                  <p className="text-xs text-slate-500">{t('appearance_desc')}</p>
                </div>
              </div>
              <Badge variant="outline" className="border-white/10 text-slate-500">{t('dark_only')}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="pt-4">
          <Button 
            variant="ghost" 
            className="w-full h-14 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400 font-bold"
            onClick={() => {
              auth.signOut();
              toast.success(t('logout_success'));
            }}
          >
            <LogOut className="w-5 h-5 mr-2" />
            {t('logout_all_devices')}
          </Button>
        </div>
      </div>

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="glass-dark border-white/5 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t('update_password') || 'Update Password'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t('password_change_desc') || 'Enter your current password and a new one to update.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('current_password') || 'Current Password'}</Label>
              <Input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('new_password') || 'New Password'}</Label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('confirm_password') || 'Confirm Password'}</Label>
              <Input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isUpdatingPassword} className="w-full bg-brand-blue hover:bg-blue-500">
                {isUpdatingPassword ? t('updating') || 'Updating...' : t('update_password') || 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Methods Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="glass-dark border-white/5 text-white rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('payment_methods')}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t('payment_methods_desc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Existing Methods */}
            <div className="space-y-3">
              {profile?.paymentMethods?.map((method: any) => (
                <div key={method.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{method.bankName}</p>
                        <Badge variant="outline" className="text-[8px] py-0 h-4 border-white/10">{method.country || 'N/A'}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">{method.accountNumber}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-slate-500 hover:text-red-500"
                    onClick={() => removePaymentMethod(method.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(!profile?.paymentMethods || profile.paymentMethods.length === 0) && (
                <p className="text-center text-xs text-slate-500 py-4 italic">{t('no_payment_methods') || 'No payment methods added yet.'}</p>
              )}
            </div>

            <div className="h-px bg-white/5" />

            {/* Add New */}
            <form onSubmit={handleAddPaymentMethod} className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('add_new_method') || 'Add New Method'}</p>
              
              <div className="space-y-2">
                <Label className="text-xs">{t('country') || 'Country'}</Label>
                <Select value={newCountry} onValueChange={setNewCountry}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                    <SelectItem value="Vietnam">Vietnam</SelectItem>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="Pakistan">Pakistan</SelectItem>
                    <SelectItem value="Nepal">Nepal</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('bank_name') || 'Bank Name'}</Label>
                <Input 
                  value={newBankName} 
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="e.g. Vietcombank"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('account_number')}</Label>
                <Input 
                  value={newAccountNumber} 
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  placeholder="1234567890"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <Button type="submit" disabled={isAddingPayment} className="w-full bg-white/10 hover:bg-white/20">
                <Plus className="w-4 h-4 mr-2" />
                {t('add_method') || 'Add Method'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
