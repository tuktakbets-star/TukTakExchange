import React, { useState, useEffect } from 'react';
import { supabaseService, where } from '../../lib/supabaseService';
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
import { motion, AnimatePresence } from 'framer-motion';
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
    const unsubRates = supabaseService.subscribeToCollection('rates', [], (data) => {
      console.log('[AdminRates] Data received:', data);
      setRates(data);
      setLoading(false);
    });
    return () => unsubRates();
  }, []);

  const [tieredRates, setTieredRates] = useState<any[]>([{ min: 0, max: 0, rate: 0 }]);
  const [tieredFees, setTieredFees] = useState<any[]>([{ min: 0, max: 0, fee: 0, type: 'percent' as 'percent' | 'flat' }]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [activeRateTab, setActiveRateTab] = useState<'rate' | 'fee'>('rate');

  const handleUpdateRate = async (e: React.FormEvent<HTMLFormElement>, id?: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const target = (formData.get('target') as string)?.toUpperCase().trim();
    const rate = parseFloat(formData.get('rate') as string);
    const date = formData.get('date') as string;
    const withdrawFee = parseFloat(formData.get('withdrawFee') as string) || 0;
    const rechargeFee = parseFloat(formData.get('rechargeFee') as string) || 0;

    try {
      if (id) {
        const { success, error } = await supabaseService.updateDocument('rates', id, { 
          rate, 
          updated_at: new Date().toISOString(),
          effective_date: date,
          tiered_rates: selectedRateId === id ? tieredRates : undefined,
          tiered_fees: selectedRateId === id ? tieredFees : undefined,
          withdraw_fee: withdrawFee,
          recharge_fee: rechargeFee
        });
        if (!success) throw error;
        toast.success(t('rate_updated_success'));
      } else {
        const res = await supabaseService.addDocument('rates', {
          base: 'VND',
          target,
          rate,
          effective_date: date,
          updated_at: new Date().toISOString(),
          tiered_rates: tieredRates,
          tiered_fees: tieredFees,
          withdraw_fee: withdrawFee,
          recharge_fee: rechargeFee
        });
        if (!res.id) throw new Error('Failed to add document');
        toast.success(t('new_rate_added'));
        (e.target as HTMLFormElement).reset();
        setTieredRates([{ min: 0, max: 0, rate: 0 }]);
        setTieredFees([{ min: 0, max: 0, fee: 0, type: 'percent' }]);
      }

      // Sync with adminSettings global_settings rates
      const currentSettingsList = await supabaseService.getCollection('admin_settings', [
        where('key', '==', 'global_settings')
      ]);
      
      const globalSettings = currentSettingsList?.[0];
      if (globalSettings) {
        const updatedRates = { ...(globalSettings.value?.rates || {}) };
        updatedRates[target] = rate;
        
        await supabaseService.updateDocument('admin_settings', globalSettings.id, {
          value: { ...globalSettings.value, rates: updatedRates },
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Rate save error:', error);
      toast.error(t('rate_save_failed'));
    }
  };

  const handleDeleteRate = async (id: string) => {
    setConfirmConfig({
      title: t('delete_rate_confirm'),
      description: t('delete_rate_confirm_msg'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await supabaseService.deleteDocument('rates', id);
          toast.success(t('rate_deleted_success'));
        } catch (error) {
          toast.error(t('delete_failed'));
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const selectedRateDoc = rates.find(r => r.target?.toUpperCase() === calcTarget?.toUpperCase());
  const selectedTieredRates = Array.isArray(selectedRateDoc?.tiered_rates) ? selectedRateDoc.tiered_rates : 
                              (Array.isArray(selectedRateDoc?.tieredRates) ? selectedRateDoc.tieredRates : []);
  
  const applicableTierForCalc = selectedTieredRates.find((t: any) => {
    const min = Number(t.min) || 0;
    const max = Number(t.max) || 0;
    return calcAmount >= min && (max === 0 || calcAmount <= max);
  });
  
  const currentRate = applicableTierForCalc && Number(applicableTierForCalc.rate) > 0 
                     ? Number(applicableTierForCalc.rate) 
                     : (Number(selectedRateDoc?.rate) || 0);
  const result = currentRate > 0 ? calcAmount / currentRate : 0;

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
                    <span className="text-purple-500">{rate.target}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span className="text-red-500">VND</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-500">{t('rate_value')} (1 {rate.target} = ? VND)</Label>
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
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-500">Service Fees (% / Flat)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                       <Input name="withdrawFee" type="number" step="any" defaultValue={rate.withdrawFee || 0} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold text-xs pl-8" />
                       <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-600 uppercase">W/D</span>
                    </div>
                    <div className="relative">
                       <Input name="rechargeFee" type="number" step="any" defaultValue={rate.rechargeFee || 0} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold text-xs pl-8" />
                       <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-600 uppercase">REC</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="dark" 
                    className={cn(
                      "h-12 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest",
                      selectedRateId === rate.id ? "bg-red-600/10 text-red-500" : "bg-white/5 text-slate-500"
                    )}
                    onClick={() => {
                       if (selectedRateId === rate.id) {
                         setSelectedRateId(null);
                       } else {
                         setSelectedRateId(rate.id);
                         setTieredRates(rate.tieredRates || [{ min: 0, max: 0, rate: 0 }]);
                         setTieredFees(rate.tieredFees || [{ min: 0, max: 0, fee: 0, type: 'percent' }]);
                       }
                    }}
                  >
                    Tiered
                  </Button>
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
                {selectedRateId === rate.id && (
                  <div className="col-span-full mt-4 p-6 bg-black/40 rounded-3xl space-y-6 border border-white/10 shadow-2xl animate-in zoom-in-95">
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 w-fit">
                      <button
                        type="button"
                        onClick={() => setActiveRateTab('rate')}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          activeRateTab === 'rate' ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-white"
                        )}
                      >
                        Rate Tiers
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveRateTab('fee')}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          activeRateTab === 'fee' ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-white"
                        )}
                      >
                        Service Fees (Amount Based)
                      </button>
                    </div>

                    {activeRateTab === 'rate' ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Exchange Rate adjustments based on amount</h5>
                           <Button 
                            type="button" 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setTieredRates([...tieredRates, { min: 0, max: 0, rate: 0 }])}
                            className="h-7 text-[10px] font-bold uppercase text-red-500"
                           >
                             + Add Rate Tier
                           </Button>
                        </div>
                        {tieredRates.map((tier, tidx) => (
                          <div key={tidx} className="grid grid-cols-4 gap-3 items-end bg-white/5 p-3 rounded-2xl border border-white/5">
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase text-slate-600 font-black">Min Amount (VND)</Label>
                              <Input 
                                type="number" 
                                value={tier.min} 
                                onChange={(e) => {
                                  const nt = [...tieredRates];
                                  nt[tidx].min = parseFloat(e.target.value);
                                  setTieredRates(nt);
                                }}
                                className="h-10 bg-black/20 border-white/10 text-xs font-bold" 
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase text-slate-600 font-black">Max Amount (0=∞)</Label>
                              <Input 
                                type="number" 
                                value={tier.max} 
                                onChange={(e) => {
                                  const nt = [...tieredRates];
                                  nt[tidx].max = parseFloat(e.target.value);
                                  setTieredRates(nt);
                                }}
                                className="h-10 bg-black/20 border-white/10 text-xs font-bold" 
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase text-slate-600 font-black">Applied Rate</Label>
                              <Input 
                                type="number" 
                                step="any"
                                value={tier.rate} 
                                onChange={(e) => {
                                  const nt = [...tieredRates];
                                  nt[tidx].rate = parseFloat(e.target.value);
                                  setTieredRates(nt);
                                }}
                                className="h-10 bg-white/5 border-white/10 text-xs font-black text-red-500" 
                              />
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setTieredRates(tieredRates.filter((_, i) => i !== tidx))}
                              className="h-10 w-10 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Transaction Fees based on Amount</h5>
                           <Button 
                            type="button" 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setTieredFees([...tieredFees, { min: 0, max: 0, fee: 0, type: 'percent' }])}
                            className="h-7 text-[10px] font-bold uppercase text-red-500"
                           >
                             + Add Fee Tier
                           </Button>
                        </div>
                        {tieredFees.map((tier, tidx) => (
                          <div key={tidx} className="grid grid-cols-5 gap-3 items-end bg-white/5 p-3 rounded-2xl border border-white/5">
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase text-slate-600 font-black">Min (VND)</Label>
                              <Input 
                                type="number" 
                                value={tier.min} 
                                onChange={(e) => {
                                  const nt = [...tieredFees];
                                  nt[tidx].min = parseFloat(e.target.value);
                                  setTieredFees(nt);
                                }}
                                className="h-10 bg-black/20 border-white/10 text-xs font-bold" 
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase text-slate-600 font-black">Max (0=∞)</Label>
                              <Input 
                                type="number" 
                                value={tier.max} 
                                onChange={(e) => {
                                  const nt = [...tieredFees];
                                  nt[tidx].max = parseFloat(e.target.value);
                                  setTieredFees(nt);
                                }}
                                className="h-10 bg-black/20 border-white/10 text-xs font-bold" 
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase text-slate-600 font-black">Fee Value</Label>
                              <Input 
                                type="number" 
                                step="any"
                                value={tier.fee} 
                                onChange={(e) => {
                                  const nt = [...tieredFees];
                                  nt[tidx].fee = parseFloat(e.target.value);
                                  setTieredFees(nt);
                                }}
                                className="h-10 bg-white/5 border-white/10 text-xs font-black text-blue-500" 
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase text-slate-600 font-black">Type</Label>
                              <select
                                value={tier.type}
                                onChange={(e) => {
                                  const nt = [...tieredFees];
                                  nt[tidx].type = e.target.value as 'percent' | 'flat';
                                  setTieredFees(nt);
                                }}
                                className="w-full h-10 bg-black/20 border border-white/10 rounded-xl px-2 text-[10px] font-bold text-slate-400 outline-none"
                              >
                                <option value="percent">Percentage (%)</option>
                                <option value="flat">Flat Fee (VND)</option>
                              </select>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setTieredFees(tieredFees.filter((_, i) => i !== tidx))}
                              className="h-10 w-10 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
