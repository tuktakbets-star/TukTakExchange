import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, AlertCircle, Info, ArrowUpRight, ArrowDownLeft, Trash2, Eye, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { firebaseService, query, collection, where, orderBy, onSnapshot, db } from '../lib/firebaseService';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { toast } from 'sonner';

export default function Notifications() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    // We can't easily do (targetId == 'all' OR targetId == uid) in a single simple query with where
    // So we subscribe to all and filter client-side for simplicity in this prototype
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        icon: (doc.data().type === 'alert' || doc.data().type === 'warning') ? AlertCircle :
              doc.data().type === 'offer' ? Tag :
              doc.data().type === 'success' ? CheckCircle2 :
              doc.data().type === 'deposit' ? ArrowDownLeft : Info
      }));
      
      const filtered = allNotifs.filter((n: any) => n.targetId === 'all' || n.targetId === profile.uid);
      setNotifications(filtered);
      setLoading(false);
    });

    return () => unsub();
  }, [profile?.uid]);

  const markAllAsRead = async () => {
    // In a real app we would update the read status in DB for this user
    // For this prototype, we'll just local toast
    toast.info(t('all_read_desc', 'Notifications marked as read locally.'));
  };

  const deleteNotification = async (id: string) => {
    try {
      await firebaseService.deleteDocument('notifications', id);
      toast.success(t('notification_deleted', 'Notification deleted'));
    } catch (error) {
      toast.error(t('operation_failed'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{t('notifications')}</h1>
            <p className="text-sm text-slate-500">{t('notificationHistory')}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={markAllAsRead}
          className="text-brand-blue hover:bg-brand-blue/5 text-sm font-bold"
        >
          {t('markAsRead')}
        </Button>
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? notifications.map((notif, idx) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "p-6 rounded-3xl border transition-all flex items-start justify-between group",
              notif.read ? "bg-white/5 border-white/5" : "bg-brand-blue/5 border-brand-blue/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]"
            )}
          >
            <div className="flex gap-4 flex-1 cursor-pointer" onClick={() => setSelectedNotif(notif)}>
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                notif.type === 'success' ? "bg-green-500/10 text-green-500" :
                notif.type === 'warning' ? "bg-red-500/10 text-red-500" :
                notif.type === 'deposit' ? "bg-blue-500/10 text-blue-500" : "bg-slate-500/10 text-slate-400"
              )}>
                <notif.icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{notif.title}</h3>
                  {!notif.read && <div className="w-2 h-2 bg-brand-blue rounded-full" />}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{notif.message || notif.desc}</p>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{notif.createdAt ? new Date(notif.createdAt).toLocaleString() : notif.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedNotif(notif)}
                className="text-slate-400 hover:text-white"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => deleteNotification(notif.id)}
                className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )) : (
          <div className="text-center py-20 glass border-white/5 rounded-[2.5rem]">
            <p className="text-slate-500 font-medium">{t('noNotifications')}</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedNotif} onOpenChange={() => setSelectedNotif(null)}>
        <DialogContent className="glass-dark border-white/10 rounded-[2rem] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold flex items-center gap-3">
               {selectedNotif && <selectedNotif.icon className="w-6 h-6 text-brand-blue" />}
               {t('notification_details')}
            </DialogTitle>
          </DialogHeader>
          {selectedNotif && (
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                 <h2 className="text-2xl font-bold text-white">{selectedNotif.title}</h2>
                 <p className="text-xs text-slate-500 uppercase tracking-widest font-bold font-mono">{selectedNotif.createdAt ? new Date(selectedNotif.createdAt).toLocaleString() : selectedNotif.time}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                 <p className="text-slate-300 leading-relaxed text-lg">
                    {selectedNotif.message || selectedNotif.desc}
                 </p>
              </div>
              <Button className="w-full h-12 bg-white/5 hover:bg-white/10 rounded-xl font-bold" onClick={() => setSelectedNotif(null)}>
                 {t('close', 'Close')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
