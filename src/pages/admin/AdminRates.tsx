import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  History, 
  Calculator, 
  Globe,
  Calendar,
  Save,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function AdminRates() {
  const { t } = useTranslation();
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calcAmount, setCalcAmount] = useState<number>(1000000);
  const [calcTarget, setCalcTarget] = useState('BDT');

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  useEffect(() => {
    const unsubRates = firebaseService.subscribeToCollection('rates', [], (data) => {
      setRates(data);
    });
    setLoading(false);
    return () => unsubRates();
  }, []);

  const handleUpdateRate = async (e: React.FormEvent<HTMLFormElement>, id?: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const target = formData.get('target') as string;
    const rate = parseFloat(formData.get('rate') as string);
    const date = formData.get('date') as string;

    try {
      if (id) {
        await firebaseService.updateDocument('rates', id, { 
          rate, 
          updatedAt: new Date().toISOString(),
          effectiveDate: date
        });
        toast.success(t('rate_updated_success'));
      } else {
        await firebaseService.addDocument('rates', {
          base: 'VND',
          target,
          rate,
          effectiveDate: date,
          updatedAt: new Date().toISOString()
        });
        toast.success(t('new_rate_added'));
        (e.target as HTMLFormElement).reset();
      }
    } catch (error) {
      toast.error(t('rate_save_failed'));
    }
  };

  const handleDeleteRate = async (id: string) => {
    setConfirmConfig({
      title: t('delete_rate_confirm'),
      description: t('delete_rate_confirm_msg'), // Make sure to add this translation key or just use description
      variant: 'danger',
      onConfirm: async () => {
        try {
          await firebaseService.deleteDocument('rates', id);
          toast.success(t('rate_deleted_success'));
        } catch (error) {
          toast.error(t('delete_failed'));
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const currentRate = rates.find(r => r.target === calcTarget)?.rate || 0;
  const result = calcAmount * currentRate;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('manageRates')}</h1>
          <p className="text-slate-400 mt-1">{t('realTimeStats')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Rate Editor */}
        <Card className="lg:col-span-2 glass-dark border-white/5 rounded-[2.5rem] p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600/10 rounded-xl flex items-center justify-center text-red-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-bold">{t('rates')}</h3>
            </div>
            <Button variant="outline" className="border-white/10 bg-white/5 rounded-xl h-10">
              <History className="w-4 h-4 mr-2" />
              {t('notificationHistory')}
            </Button>
          </div>

          <div className="space-y-6">
            {rates.map((rate) => (
              <form 
                key={rate.id} 
                onSubmit={(e) => handleUpdateRate(e, rate.id)}
                className="grid md:grid-cols-4 gap-4 p-6 bg-white/5 rounded-3xl border border-white/5 items-end group"
              >
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-500">{t('currency_pair')}</Label>
                  <div className="flex items-center gap-2 h-12 px-4 bg-white/5 rounded-xl border border-white/10 font-bold">
                    <span className="text-red-500">VND</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span className="text-purple-500">{rate.target}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-500">{t('rate_value')} {t('rate_value_desc')}</Label>
                  <Input 
                    key={`${rate.id}-rate-${rate.rate}`}
                    name="rate" 
                    type="number" 
                    step="any" 
                    defaultValue={rate.rate} 
                    className="h-12 bg-white/5 border-white/10 rounded-xl font-display font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-500">{t('effective_date')}</Label>
                  <Input 
                    key={`${rate.id}-date-${rate.effectiveDate}`}
                    name="date" 
                    type="date" 
                    defaultValue={rate.effectiveDate || new Date().toISOString().split('T')[0]} 
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-xs" 
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 h-12 bg-red-600 hover:bg-red-500 rounded-xl">
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="h-12 w-12 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                    onClick={() => handleDeleteRate(rate.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            ))}

            <div className="p-8 border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.02]">
              <h4 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-4 h-4" /> {t('add_new_pair')}
              </h4>
              <form onSubmit={(e) => handleUpdateRate(e)} className="grid md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>{t('target_currency')}</Label>
                  <Input name="target" placeholder={t('target_currency_placeholder')} required className="h-12 bg-white/5 border-white/10 rounded-xl uppercase" />
                </div>
                <div className="space-y-2">
                  <Label>{t('initial_rate')}</Label>
                  <Input name="rate" type="number" step="any" required className="h-12 bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>{t('effective_date')}</Label>
                  <Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                </div>
                <Button type="submit" className="h-12 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold">
                  {t('add_pair')}
                </Button>
              </form>
            </div>
          </div>
        </Card>

        {/* Calculator Preview */}
        <div className="space-y-8">
          <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                <Calculator className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-bold">{t('calculator')}</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs">{t('amount')}</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={calcAmount} 
                    onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 font-display font-bold text-lg" 
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₫</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 text-xs">{t('receiver_gets')}</Label>
                <select 
                  value={calcTarget} 
                  onChange={(e) => setCalcTarget(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white outline-none focus:ring-2 focus:ring-purple-500/20 font-bold"
                >
                  {rates.map(r => (
                    <option key={r.target} value={r.target}>{r.target}</option>
                  ))}
                </select>
              </div>

              <div className="p-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-[2rem] text-white shadow-xl shadow-purple-600/20">
                <p className="text-xs opacity-80 uppercase tracking-widest font-bold mb-2">{t('estimated_result')}</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-4xl font-display font-bold">{result.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h4>
                  <span className="text-xl font-bold opacity-80">{calcTarget}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
                  <span>{t('current_rate')}: {currentRate}</span>
                  <span>{t('fee')}: 0.00%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-bold">{t('global_sync')}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              {t('global_sync_desc')}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {t('sync_feature_1')}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {t('sync_feature_2')}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {t('sync_feature_3')}
              </div>
            </div>
          </Card>
        </div>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmConfig?.onConfirm || (() => {})}
        title={confirmConfig?.title || ''}
        description={confirmConfig?.description || ''}
        variant={confirmConfig?.variant}
      />
    </div>
  );
}
