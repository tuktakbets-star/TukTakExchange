import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseService, where } from '../lib/supabaseService';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  phoneNumber?: string;
  accountNumber?: string;
  role: 'user' | 'admin';
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  createdAt: string;
  notificationsEnabled?: boolean;
  twoFactorEnabled?: boolean;
  currentSessionId?: string;
  sessionStatus?: 'active' | 'inactive';
  lastActiveAt?: string;
  paymentMethods?: Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    createdAt: string;
  }>;
  kycData?: {
    passportUrl: string;
    selfieUrl: string;
    submittedAt?: string;
  };
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthReady: boolean;
  logout: (soft?: boolean) => Promise<void>;
  pendingLoginRequest: any | null;
  approveLoginRequest: (requestId: string) => Promise<void>;
  rejectLoginRequest: (requestId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isAuthReady: false,
  logout: async () => {},
  pendingLoginRequest: null,
  approveLoginRequest: async () => {},
  rejectLoginRequest: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [pendingLoginRequest, setPendingLoginRequest] = useState<any | null>(null);

  const logout = async (soft = false) => {
    try {
      await supabaseService.signOut();
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("sessionId");
      
      if (soft) {
        navigate('/overview');
      } else {
        window.location.href = '/overview';
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const approveLoginRequest = async (requestId: string) => {
    try {
      await supabaseService.updateDocument('login_requests', requestId, { status: 'approved' });
      setPendingLoginRequest(null);
      // Kick this device out
      await logout(true);
    } catch (error) {
      console.error("Error approving request:", error);
    }
  };

  const rejectLoginRequest = async (requestId: string) => {
    try {
      await supabaseService.updateDocument('login_requests', requestId, { status: 'rejected' });
      setPendingLoginRequest(null);
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeRequests: (() => void) | null = null;

    // Local Session ID management
    let localSessionId = sessionStorage.getItem('sessionId');
    if (!localSessionId) {
      localSessionId = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('sessionId', localSessionId);
    }

    // Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sbUser = session?.user || null;
      setUser(sbUser);
      setIsAuthReady(true);
      
      if (sbUser) {
        if (unsubscribeProfile) unsubscribeProfile();
        if (unsubscribeRequests) unsubscribeRequests();

        unsubscribeProfile = supabaseService.subscribeToDocument('users', sbUser.id, async (data) => {
          if (data) {
            const profileData = data as UserProfile;
            
            // Session Management: If sessionId on server doesn't match local, we've been kicked out
            const serverSessionId = profileData.currentSessionId;
            const currentLocalSessionId = sessionStorage.getItem('sessionId');
            
            if (serverSessionId && currentLocalSessionId && serverSessionId !== currentLocalSessionId) {
              // Forced logout due to new device login
              logout(true);
              return;
            }

            setProfile(profileData);
            setLoading(false);

            // Listen for login requests for this user
            if (!unsubscribeRequests) {
              unsubscribeRequests = supabaseService.subscribeToCollection('login_requests', [
                where('uid', '==', sbUser.id),
                where('status', '==', 'pending')
              ], (requests) => {
                if (requests && requests.length > 0) {
                  // Only show if it's not from THIS device (though device info is just for display)
                  setPendingLoginRequest(requests[0]);
                } else {
                  setPendingLoginRequest(null);
                }
              });
            }
          } else {
            const adminEmails = [
              'tuktakbets@gmail.com', 
              'shohagrana284650@gmail.com', 
              'shohagrana28465@gmail.com',
              'shohagrana84650@gmail.com', 
              'shohagrana4650@gmail.com', 
              'shohagrana650@gmail.com', 
              'shohagrana60@gmail.com'
            ];
            const newProfile: UserProfile = {
              uid: sbUser.id,
              email: sbUser.email || '',
              displayName: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || '',
              photoURL: sbUser.user_metadata?.avatar_url || '',
              phoneNumber: '',
              accountNumber: '',
              role: adminEmails.includes(sbUser.email || '') ? 'admin' : 'user',
              kycStatus: 'none',
              createdAt: new Date().toISOString(),
            };
            await supabaseService.setDocument('users', sbUser.id, newProfile);
            setProfile(newProfile);
            setLoading(false);
          }
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        unsubscribeProfile = null;
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' || 
             ['tuktakbets@gmail.com', 'shohagrana284650@gmail.com', 'shohagrana28465@gmail.com', 'shohagrana84650@gmail.com', 'shohagrana4650@gmail.com', 'shohagrana650@gmail.com', 'shohagrana60@gmail.com'].includes(user?.email || ''),
    isAuthReady,
    logout,
    pendingLoginRequest,
    approveLoginRequest,
    rejectLoginRequest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
