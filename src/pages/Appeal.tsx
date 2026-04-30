import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { supabaseService } from '@/lib/supabaseService';
import { 
  AlertTriangle, 
  MessageSquare, 
  ArrowLeft, 
  Send,
  Upload,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function Appeal() {
  const { t } = useTranslation();
  const { txId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tx, setTx] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!txId) return;
    const unsub = supabaseService.subscribeToDocument('transactions', txId, (data) => {
      setTx(data);
    });
    return () => unsub();
  }, [txId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update transaction status to disputed
      await supabaseService.updateDocument('transactions', txId!, {
        status: 'disputed',
        dispute_info: {
          reason,
          description,
          opened_at: new Date().toISOString(),
          status: 'open'
        }
      });

      // Create first message in dispute chat
      await supabaseService.addDocument(`disputes/${txId}/messages`, {
        tx_id: txId,
        sender_id: profile?.uid || profile?.id,
        sender_name: profile?.displayName || profile?.username || 'User',
        sender_role: 'user',
        text: `NEW APPEAL FILED: ${reason}. Description: ${description}`,
        type: 'system',
        created_at: new Date().toISOString()
      });

      // Notify admin
      await supabaseService.addDocument('notifications', {
        uid: 'admin',
        title: 'New Dispute Filed',
        message: `User ${profile?.displayName} has filed a dispute for transaction ${txId?.substring(0, 8)}`,
        type: 'dispute',
        tx_id: txId,
        created_at: new Date().toISOString(),
        read: false
      });

      toast.success('Dispute filed successfully! Entering chat...');
      navigate(`/dispute-chat/${txId}`);
    } catch (error) {
      toast.error('Failed to file dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tx) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 text-slate-400">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-display font-bold">File an Appeal</h1>
          <p className="text-slate-400">Transaction ID: {txId?.substring(0, 8)}</p>
        </div>

        <Card className="glass-dark border-white/5 rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 border-b border-white/5">
            <CardTitle className="text-xl">Appeal Details</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Reason for Appeal</Label>
                <Input 
                  placeholder="e.g. Payment not received, Incorrect amount" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Detailed Description</Label>
                <Textarea 
                  placeholder="Please describe the issue in detail..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white/5 border-white/10 min-h-[150px] rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Evidence (Optional)</Label>
                <div 
                  className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-brand-blue/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('proof-upload')?.click()}
                >
                  <input 
                    id="proof-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                  {proofFile ? (
                    <div className="flex items-center justify-center gap-2 text-brand-blue">
                      <FileText className="w-5 h-5" />
                      <span className="text-sm font-bold">{proofFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-slate-500" />
                      <p className="text-sm text-slate-500">Upload bank statement or screenshots</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold shadow-xl shadow-red-600/20"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/5 border border-yellow-500/10 rounded-3xl p-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-yellow-500">Important Information</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Appeals are reviewed manually by our administration team. This process can take up to 24 hours. 
                Please provide as much information as possible to expedite your request.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
