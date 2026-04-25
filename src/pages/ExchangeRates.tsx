import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { firebaseService } from '../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Search, 
  ArrowRightLeft,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { toast } from 'sonner';

const chartData = [
  { name: '00:00', value: 0.00341 },
  { name: '04:00', value: 0.00342 },
  { name: '08:00', value: 0.00339 },
  { name: '12:00', value: 0.00345 },
  { name: '16:00', value: 0.00343 },
  { name: '20:00', value: 0.00344 },
  { name: '23:59', value: 0.00346 },
];

export default function ExchangeRates() {
  const { t } = useTranslation();
  const { profile, isAdmin } = useAuth();
  const [rates, setRates] = useState<any[]>([]);
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = firebaseService.subscribeToCollection('rates', [], (data) => {
      setRates(data);
    });
    return () => unsub();
  }, []);

  const [calcAmount, setCalcAmount] = useState('1000000');
  const [calcTarget, setCalcTarget] = useState('BDT');

  const currentRateObj = rates.find(r => r.target?.toUpperCase() === calcTarget?.toUpperCase());
  const currentRate = currentRateObj?.rate || 0;
  const convertedAmount = currentRate > 0 ? parseFloat(calcAmount) / currentRate : 0;

  const handleUpdateRate = async (pair: string) => {
    if (!editValue || isNaN(Number(editValue))) {
      toast.error(t('invalid_rate'));
      return;
    }
    try {
      await firebaseService.updateDocument('rates', pair, {
        rate: Number(editValue),
        updatedAt: new Date().toISOString()
      });
      toast.success(t('rate_updated_success'));
      setEditingPair(null);
    } catch (error) {
      toast.error(t('rate_update_failed'));
    }
  };

  const filteredRates = rates.filter(r => 
    r.target.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('exchangeRates')}</h1>
          <p className="text-slate-400">{t('exchange_rates_desc')}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder={t('search_currency')} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border-white/10 pl-9 h-11 w-full md:w-64 rounded-xl" 
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-dark border-white/5 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">VND / INR {t('trend')}</h3>
                  <p className="text-xs text-slate-500">{t('last_24_hours')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-display font-bold">0.00346</p>
                <p className="text-xs text-green-400 font-bold">+0.45%</p>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            {filteredRates.map((rate, idx) => (
              <Card key={idx} className="glass border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs uppercase">
                      {rate.target}
                    </div>
                    <div>
                      <p className="font-bold">{rate.base}/{rate.target}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t('global_market')}</p>
                    </div>
                  </div>
                  {isAdmin && editingPair !== rate.id && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-500 hover:text-white"
                      onClick={() => {
                        setEditingPair(rate.id);
                        setEditValue(rate.rate.toString());
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="flex items-end justify-between">
                  {editingPair === rate.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <Input 
                        type="number" 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)}
                        className="bg-white/5 border-white/10 h-9 text-sm"
                      />
                      <Button size="icon" className="h-9 w-9 bg-green-600 hover:bg-green-500" onClick={() => handleUpdateRate(rate.id)}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400" onClick={() => setEditingPair(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-display font-bold">{rate.rate}</div>
                      <div className="flex items-center gap-1 text-xs font-bold text-green-400">
                        <TrendingUp className="w-3 h-3" />
                        +0.2%
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="glass-dark border-white/5 rounded-3xl p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-lg font-display font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-brand-blue" />
                {t('quick_convert')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">{t('from')} VND</Label>
                <Input 
                  value={calcAmount} 
                  onChange={(e) => setCalcAmount(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 rounded-xl text-lg font-bold" 
                />
              </div>
              <div className="flex justify-center -my-2 relative z-10">
                <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border border-white/10">
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">{t('to')}</Label>
                  <Select value={calcTarget} onValueChange={setCalcTarget}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl text-lg font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {rates.map(r => (
                        <SelectItem key={r.target} value={r.target}>{r.target}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/10">
                   <p className="text-2xl font-bold text-brand-blue">
                     {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {calcTarget}
                   </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                    {currentRate > 0 ? `1 ${calcTarget} = ${currentRate} VND` : t('rate_not_set')}
                  </p>
                </div>
              </div>
              <Button className="w-full h-12 bg-brand-blue hover:bg-blue-500 text-white rounded-xl font-bold mt-4">
                {t('send_now')}
              </Button>
            </CardContent>
          </Card>

          <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
            <h4 className="font-bold mb-4">{t('market_status')}</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{t('status')}</span>
                <span className="text-green-400 font-bold flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  {t('open')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{t('volatility')}</span>
                <span className="text-white font-medium">{t('low')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{t('last_update')}</span>
                <span className="text-slate-500">{t('just_now')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
