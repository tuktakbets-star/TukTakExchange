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

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState(profile?.notificationsEnabled !== false);
  const [twoFactor, setTwoFactor] = useState(profile?.twoFactorEnabled || false);

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
            <div className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group">
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

            <div className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group">
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
    </div>
  );
}
