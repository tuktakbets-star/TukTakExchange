import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { firebaseService } from '../lib/firebaseService';

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
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthReady: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isAuthReady: false,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const logout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = '/overview';
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      
      if (firebaseUser) {
        // Clear previous subscription
        if (unsubscribeProfile) unsubscribeProfile();

        // Listen for profile changes
        unsubscribeProfile = firebaseService.subscribeToDocument('users', firebaseUser.uid, async (data) => {
          if (data) {
            setProfile(data as UserProfile);
            setLoading(false);
          } else {
            // Create profile if it doesn't exist
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
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              phoneNumber: firebaseUser.phoneNumber || '',
              accountNumber: firebaseUser.phoneNumber || '',
              role: adminEmails.includes(firebaseUser.email || '') ? 'admin' : 'user',
              kycStatus: 'none',
              createdAt: new Date().toISOString(),
            };
            await firebaseService.setDocument('users', firebaseUser.uid, newProfile);
            // Snapshot will pick this up
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
      unsubscribeAuth();
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
