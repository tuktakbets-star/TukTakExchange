import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  Bell, 
  Send, 
  Users, 
  User, 
  AlertCircle, 
  Tag, 
  ShieldAlert,
  History,
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminNotifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubNotifs = firebaseService.subscribeToCollection('notifications', [], (data) => {
      setNotifications(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => setUsers(data));
    setLoading(false);
    return () => {
      unsubNotifs();
      unsubUsers();
    };
  }, []);

  const handleSendNotification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const message = formData.get('message') as string;
    const type = formData.get('type') as 'alert' | 'offer' | 'warning';

    try {
      const notifData = {
        title,
        message,
        type,
        createdAt: new Date().toISOString(),
        read: false,
        targetId: targetType === 'specific' ? selectedUser : 'all'
      };

      await firebaseService.addDocument('notifications', notifData);
      toast.success(t('notification_sent'));
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast.error(t('operation_failed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_action'))) return;
    try {
      await firebaseService.deleteDocument('notifications', id);
      toast.success(t('completed'));
    } catch (error) {
      toast.error(t('operation_failed'));
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('notifications')}</h1>
          <p className="text-slate-400 mt-1">{t('realTimeStats')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Composer */}
        <Card className="lg:col-span-1 glass-dark border-white/5 rounded-[2.5rem] p-8 h-fit sticky top-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-red-600/10 rounded-xl flex items-center justify-center text-red-500">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-display font-bold">{t('sendMsg')}</h3>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-6">
            <div className="space-y-4">
              <Label>{t('target_audience')}</Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                    targetType === 'all' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-slate-400 hover:text-white"
                  )}
                >
                  <Users className="w-3 h-3" /> {t('all_users')}
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('specific')}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                    targetType === 'specific' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-slate-400 hover:text-white"
                  )}
                >
                  <User className="w-3 h-3" /> {t('specific_user')}
                </button>
              </div>
            </div>

            {targetType === 'specific' && (
              <div className="space-y-2">
                <Label>{t('select_user')}</Label>
                <select 
                  value={selectedUser} 
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:ring-2 focus:ring-red-500/20 text-sm"
                >
                  <option value="">{t('select_a_user')}</option>
                  {users.map(u => (
                    <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('notification_type')}</Label>
              <select name="type" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:ring-2 focus:ring-red-500/20 text-sm">
                <option value="alert">{t('alert_important')}</option>
                <option value="offer">{t('offer_promotion')}</option>
                <option value="warning">{t('warning_security')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>{t('title')}</Label>
              <Input name="title" required placeholder={t('notification_title_placeholder')} className="h-12 bg-white/5 border-white/10 rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label>{t('message_content')}</Label>
              <textarea 
                name="message" 
                required 
                placeholder={t('write_message_placeholder')} 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[120px] text-sm" 
              />
            </div>

            <Button type="submit" className="w-full h-14 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20">
              {t('send_notification')}
            </Button>
          </form>
        </Card>

        {/* History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-display font-bold flex items-center gap-3">
              <History className="w-5 h-5 text-slate-500" />
              {t('notificationHistory')}
            </h3>
            <Badge variant="outline" className="border-white/10 text-slate-500">
              {notifications.length} {t('completed')}
            </Badge>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {notifications.map((notif, idx) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="glass-dark border-white/5 rounded-3xl p-6 group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          notif.type === 'alert' ? "bg-red-500/10 text-red-500" :
                          notif.type === 'offer' ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                        )}>
                          {notif.type === 'alert' ? <ShieldAlert className="w-5 h-5" /> :
                           notif.type === 'offer' ? <Tag className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{notif.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                            <Clock className="w-3 h-3" />
                            {new Date(notif.createdAt).toLocaleString()}
                            <span>•</span>
                            <span className={notif.targetId === 'all' ? "text-blue-400" : "text-purple-400"}>
                              {t('target')}: {notif.targetId === 'all' ? t('global') : t('specific_user')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => handleDelete(notif.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
                      {notif.message}
                    </p>
                    <div className="mt-4 flex items-center justify-end gap-4">
                      <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        {t('delivered')}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {notifications.length === 0 && (
              <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">{t('noNotifications')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
