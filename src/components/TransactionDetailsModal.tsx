import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Building2, 
  User, 
  Landmark, 
  Calendar, 
  DollarSign, 
  Tag, 
  ExternalLink, 
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { ImageViewer } from './ImageViewer';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tx: any;
  user: any;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  isOpen,
  onClose,
  tx,
  user
}) => {
  const [viewerSrc, setViewerSrc] = React.useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);

  if (!tx) return null;

  const DetailRow = ({ label, value, icon: Icon, isMonospace = false }: any) => (
    <div className="flex justify-between items-start py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 text-slate-500">
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
        <span className="text-xs uppercase tracking-wider font-bold">{label}</span>
      </div>
      <span className={cn(
        "text-sm font-medium text-white text-right break-all max-w-[60%]",
        isMonospace && "font-mono"
      )}>
        {value || 'N/A'}
      </span>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-bold text-white">Transaction Details</h2>
                <p className="text-sm text-slate-500">Full information for ID: {tx.id}</p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="space-y-6 lg:col-span-1">
                <div>
                  <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-4">User Information</h3>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <DetailRow label="Name" value={user?.displayName} icon={User} />
                    <DetailRow label="Email" value={user?.email} icon={User} />
                    <DetailRow label="UID" value={tx.uid} icon={Tag} isMonospace />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-purple-500 uppercase tracking-widest mb-4">Core Transaction</h3>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <DetailRow label="Type" value={tx.type} icon={Tag} />
                    <DetailRow label="Status" value={tx.status} icon={Tag} />
                    <DetailRow label="Amount" value={`${tx.amount?.toLocaleString()} ${tx.currency}`} icon={DollarSign} />
                    <DetailRow label="Created At" value={new Date(tx.createdAt).toLocaleString()} icon={Calendar} />
                  </div>
                </div>
              </div>

              <div className="space-y-6 lg:col-span-2 grid md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {tx.bankInfo && (
                    <div>
                      <h3 className="text-sm font-bold text-green-500 uppercase tracking-widest mb-4">Bank/Payment Info</h3>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <DetailRow label="Bank Name" value={tx.bankInfo.bankName} icon={Landmark} />
                        <DetailRow label="Account Name" value={tx.bankInfo.accountName} icon={User} />
                        <DetailRow label="Account #" value={tx.bankInfo.accountNumber} icon={CreditCard} isMonospace />
                        {tx.bankInfo.qrCode && (
                          <div className="mt-4 pt-4 border-t border-white/5 group">
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">QR Code</p>
                             <div 
                               className="relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black/20"
                               onClick={() => {
                                 setViewerSrc(tx.bankInfo.qrCode);
                                 setIsViewerOpen(true);
                               }}
                             >
                               <img src={tx.bankInfo.qrCode} alt="QR Code" referrerPolicy="no-referrer" className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity" />
                               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                                 <Eye className="w-8 h-8 text-white" />
                               </div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tx.receiverInfo && (
                    <div>
                      <h3 className="text-sm font-bold text-green-500 uppercase tracking-widest mb-4">Receiver Information</h3>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <DetailRow label="Receiver Name" value={tx.receiverInfo.name} icon={User} />
                        <DetailRow label="Bank Name" value={tx.receiverInfo.bankName} icon={Landmark} />
                        <DetailRow label="Account #" value={tx.receiverInfo.accountNumber} icon={Building2} isMonospace />
                        <DetailRow label="Branch" value={tx.receiverInfo.branch} icon={Building2} />
                        <DetailRow label="Amount (Target)" value={`${tx.targetAmount} ${tx.targetCurrency}`} icon={DollarSign} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {tx.rechargeDetails && (
                    <div>
                      <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-4">Recharge Details</h3>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <DetailRow label="Operator" value={tx.rechargeDetails.operator} icon={Tag} />
                        <DetailRow label="Phone" value={tx.rechargeDetails.phoneNumber} icon={Tag} />
                        <DetailRow label="Country" value={tx.rechargeDetails.country} icon={Tag} />
                      </div>
                    </div>
                  )}

                  {tx.proofUrl && (
                    <div>
                      <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-4">User Payment Proof</h3>
                      <div 
                        className="relative cursor-pointer group rounded-2xl overflow-hidden border border-white/10 bg-white/5"
                        onClick={() => {
                          setViewerSrc(tx.proofUrl);
                          setIsViewerOpen(true);
                        }}
                      >
                        <img src={tx.proofUrl} alt="User Proof" referrerPolicy="no-referrer" className="w-full max-h-48 object-cover opacity-60 group-hover:opacity-100 transition-all" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {tx.receiverInfo?.qrCode && (
                    <div>
                      <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Receiver QR Code</h3>
                      <div 
                        className="relative cursor-pointer group rounded-2xl overflow-hidden border border-white/10 bg-white/5"
                        onClick={() => {
                          setViewerSrc(tx.receiverInfo.qrCode);
                          setIsViewerOpen(true);
                        }}
                      >
                        <img src={tx.receiverInfo.qrCode} alt="Receiver QR" referrerPolicy="no-referrer" className="w-full max-h-48 object-cover opacity-60 group-hover:opacity-100 transition-all" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {tx.adminProof && (
                    <div>
                      <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-4">Admin Payout Proof</h3>
                      <div 
                        className="relative cursor-pointer group rounded-2xl overflow-hidden border border-white/10 bg-white/5"
                        onClick={() => {
                          setViewerSrc(tx.adminProof);
                          setIsViewerOpen(true);
                        }}
                      >
                        <img src={tx.adminProof} alt="Admin Proof" referrerPolicy="no-referrer" className="w-full max-h-48 object-cover opacity-60 group-hover:opacity-100 transition-all border-2 border-blue-500/20" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/40 backdrop-blur-sm">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={onClose} className="bg-white/5 hover:bg-white/10 text-white border-0 py-6 px-12 rounded-2xl font-bold">
                Close Details
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <ImageViewer 
      isOpen={isViewerOpen}
      onClose={() => setIsViewerOpen(false)}
      src={viewerSrc}
      alt="Transaction Preview"
    />
    </>
  );
};

const CreditCard = Landmark;
