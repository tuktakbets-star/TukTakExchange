import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Globe, 
  ArrowRightLeft,
  RefreshCw,
  Clock,
  BadgeDollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';

export default function LiveRates() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rates, setRates] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsub = firebaseService.subscribeToCollection('rates', [], (data) => {
      setRates(data);
    });
    return () => unsub();
  }, []);

  const [calcAmount, setCalcAmount] = useState<number>(1000000);
  const [calcTarget, setCalcTarget] = useState('BDT');

  const currentRate = rates.find(r => r.target?.toUpperCase() === calcTarget?.toUpperCase())?.rate || 0;
  const result = currentRate > 0 ? calcAmount / currentRate : 0;

  const handleSendMoneyNow = () => {
    if (user) {
      navigate('/send');
    } else {
      navigate('/auth?mode=register');
    }
  };

  const filteredRates = rates.filter(r => 
    r.target.toLowerCase().includes(search.toLowerCase()) ||
    r.base.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 pt-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-2">
          <BackButton />
          <div>
            <h1 className="text-3xl font-display font-bold text-white">{t('liveExchangeRates')}</h1>
            <p className="text-slate-400">{t('live_rates_desc')}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder={t('search_currency')} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border-white/10 pl-9 h-11 w-full md:w-64 rounded-xl"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            className="border-white/10 bg-white/5 h-11 w-11 rounded-xl"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
          {filteredRates.map((rate, idx) => (
            <motion.div
              key={rate.id || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden group hover:border-brand-blue/30 transition-all">
                <CardHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">{rate.base}/{rate.target}</CardTitle>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t('mid_market_rate')}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      {t('active')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{t('current_value')}</p>
                      <h3 className="text-3xl font-display font-bold">
                        {rate.rate.toFixed(4)}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-green-500 text-sm font-bold">
                        <TrendingUp className="w-4 h-4" />
                        +0.24%
                      </div>
                      <p className="text-[10px] text-slate-500">{t('last_24_hours')}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{t('inverse_rate')}</span>
                      <span className="font-mono">{(1/rate.rate).toFixed(4)} {rate.base}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{t('last_updated')}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t('just_now')}
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSendMoneyNow}
                    className="w-full bg-white/5 hover:bg-brand-blue hover:text-white border border-white/10 rounded-xl h-11 font-bold transition-all"
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    {t('exchange_now')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Calculator */}
        <div className="space-y-6">
          <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 sticky top-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                <BadgeDollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-bold">{t('rate_calculator')}</h3>
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
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white outline-none focus:ring-2 focus:ring-brand-blue/20 font-bold"
                >
                  {rates.map(r => (
                    <option key={r.target} value={r.target}>{r.target}</option>
                  ))}
                </select>
              </div>

              <div className="p-8 bg-gradient-to-br from-brand-blue to-purple-600 rounded-[2rem] text-white shadow-xl shadow-brand-blue/20">
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

              <Button 
                onClick={handleSendMoneyNow}
                className="w-full h-14 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl font-bold text-lg"
              >
                {t('send_money_now')}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {filteredRates.length === 0 && (
        <div className="py-20 text-center glass-dark rounded-[2.5rem] border border-dashed border-white/10">
          <Globe className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-400">{t('no_rates_found')}</h3>
          <p className="text-slate-500">{t('no_rates_found_desc')}</p>
        </div>
      )}
      </div>
    </div>
  );
}
