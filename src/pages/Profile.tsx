import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { firebaseService } from '../lib/firebaseService';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  FileText,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Profile() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhoneNumber(profile.phoneNumber || '');
    }
  }, [profile]);

  // Helper to convert file to base64
  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleUpdateProfile = async () => {
    if (!profile?.uid) return;
    setIsSubmitting(true);
    try {
      await firebaseService.updateDocument('users', profile.uid, {
        displayName,
        phoneNumber
      });
      toast.success(t('profile_updated'));
      setIsEditing(false);
    } catch (error) {
      toast.error(t('profile_update_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKYCSubmit = async () => {
    if (!profile?.uid) return;
    if (!passportFile || !selfieFile) {
      toast.error('Please upload both Passport and Selfie');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Process files to Base64
      const [passportBase64, selfieBase64] = await Promise.all([
        toBase64(passportFile),
        toBase64(selfieFile)
      ]);

      const submission = {
        uid: profile.uid,
        userName: profile.displayName || 'User',
        userEmail: profile.email,
        passportUrl: passportBase64,
        selfieUrl: selfieBase64,
        status: 'pending',
        submittedAt: new Date().toISOString()
      };
      
      await firebaseService.addDocument('kycSubmissions', submission);
      await firebaseService.updateDocument('users', profile.uid, { 
        kycStatus: 'pending',
        kycData: {
          passportUrl: passportBase64,
          selfieUrl: selfieBase64,
          submittedAt: submission.submittedAt
        }
      });
      
      toast.success('KYC documents submitted successfully!');
      setPassportFile(null);
      setSelfieFile(null);
    } catch (error) {
      console.error('KYC submission error:', error);
      toast.error('Failed to submit KYC documents. Files might be too large.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;

    setIsUploadingPhoto(true);
    try {
      const base64 = await toBase64(file);
      await firebaseService.updateDocument('users', profile.uid, {
        photoURL: base64
      });
      toast.success(t('profile_updated'));
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error(t('profile_update_failed'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative group">
          <Avatar className="w-32 h-32 border-4 border-white/5 shadow-2xl">
            <AvatarImage src={profile?.photoURL} />
            <AvatarFallback className="bg-brand-blue/20 text-brand-blue text-4xl font-bold">
              {profile?.displayName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <input 
            type="file" 
            id="profile-photo-input" 
            className="hidden" 
            accept="image/*"
            onChange={handlePhotoUpload}
          />
          <button 
            disabled={isUploadingPhoto}
            onClick={() => document.getElementById('profile-photo-input')?.click()}
            className="absolute bottom-0 right-0 w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center border-4 border-slate-950 text-white hover:scale-110 transition-transform disabled:opacity-50"
          >
            {isUploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          </button>
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-display font-bold mb-2">{profile?.displayName}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-400 px-3 py-1">
              <Mail className="w-3 h-3 mr-2" />
              {profile?.email}
            </Badge>
            <Badge className={cn(
              "px-3 py-1",
              profile?.kycStatus === 'verified' ? "bg-green-500/20 text-green-500 border-green-500/20" : 
              profile?.kycStatus === 'pending' ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/20" : "bg-red-500/20 text-red-500 border-red-500/20"
            )}>
              <ShieldCheck className="w-3 h-3 mr-2" />
              {t('kycStatus')}: {profile?.kycStatus === 'pending' ? t('waiting_for_admin') : profile?.kycStatus ? t(profile.kycStatus) : t('none')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="glass-dark border-white/5 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-display font-bold">{t('personal_info')}</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-brand-blue"
              onClick={() => {
                if (isEditing) {
                  setIsConfirmOpen(true);
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isSubmitting}
            >
              {isEditing ? t('save') : t('edit_profile')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-500">{t('fullName')}</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <Input 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isEditing}
                  className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl disabled:opacity-100 disabled:cursor-default"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-500">Account Number (Phone)</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <Input 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={!isEditing}
                  placeholder="+84..."
                  className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl disabled:opacity-100 disabled:cursor-default"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-500">{t('account_type')}</Label>
              <Input 
                value={profile?.role ? t(profile.role.toLowerCase()) : ''} 
                disabled 
                className="bg-white/5 border-white/10 h-12 rounded-xl disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-xl font-display font-bold">{t('kycStatus')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {profile?.kycStatus === 'verified' ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{t('kyc_verified_title')}</h4>
                  <p className="text-sm text-slate-400">{t('kyc_verified_desc')}</p>
                </div>
              </div>
            ) : profile?.kycStatus === 'pending' || profile?.kycStatus === 'verified' ? (
              <div className="text-center py-8 space-y-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
                  profile.kycStatus === 'verified' ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                )}>
                  {profile.kycStatus === 'verified' ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                </div>
                <div>
                  <h4 className="font-bold text-lg">{profile.kycStatus === 'verified' ? t('kyc_verified_title') : t('kyc_pending_title')}</h4>
                  <p className="text-sm text-slate-400 mb-6">{profile.kycStatus === 'verified' ? t('kyc_verified_desc') : t('kyc_pending_desc')}</p>
                  
                  <Button 
                    variant="outline" 
                    className="border-white/10 bg-white/5 rounded-xl"
                    onClick={() => setShowDocs(!showDocs)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showDocs ? t('hide_documents') : t('view_submitted_docs')}
                  </Button>

                  <AnimatePresence>
                    {showDocs && profile.kycData && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-2 gap-4 mt-6 overflow-hidden"
                      >
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Passport</p>
                          <img src={profile.kycData.passportUrl} alt="Passport" className="w-full aspect-video object-cover rounded-xl border border-white/5" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Selfie</p>
                          <img src={profile.kycData.selfieUrl} alt="Selfie" className="w-full aspect-video object-cover rounded-xl border border-white/5" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-slate-400">
                  {t('kyc_none_desc')}
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className="border-2 border-dashed border-white/10 rounded-3xl p-6 text-center hover:border-brand-blue/50 transition-colors cursor-pointer group"
                    onClick={() => document.getElementById('passport-upload')?.click()}
                  >
                    <input 
                      id="passport-upload" 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => setPassportFile(e.target.files?.[0] || null)}
                    />
                    {passportFile ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-8 h-8 text-brand-blue mb-2" />
                        <p className="text-[10px] font-medium truncate w-full">{passportFile.name}</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-700 group-hover:text-brand-blue transition-colors mx-auto mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Passport Copy</p>
                      </>
                    )}
                  </div>

                  <div 
                    className="border-2 border-dashed border-white/10 rounded-3xl p-6 text-center hover:border-brand-blue/50 transition-colors cursor-pointer group"
                    onClick={() => document.getElementById('selfie-upload')?.click()}
                  >
                    <input 
                      id="selfie-upload" 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                    />
                    {selfieFile ? (
                      <div className="flex flex-col items-center">
                        <Camera className="w-8 h-8 text-brand-blue mb-2" />
                        <p className="text-[10px] font-medium truncate w-full">{selfieFile.name}</p>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-slate-700 group-hover:text-brand-blue transition-colors mx-auto mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selfie with ID</p>
                      </>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleKYCSubmit} 
                  disabled={!passportFile || !selfieFile || isSubmitting}
                  className="w-full h-12 bg-brand-blue hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  {isSubmitting ? t('uploading') : t('submit_documents')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleUpdateProfile}
        title={t('confirm_profile_update')}
        description={t('confirm_profile_update_msg')}
      />
    </div>
  );
}
