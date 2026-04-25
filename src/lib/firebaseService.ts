import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { auth, db } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  async getDocument(path: string, id: string) {
    try {
      const docRef = doc(db, path, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
    }
  },

  async setDocument(path: string, id: string, data: any) {
    try {
      await setDoc(doc(db, path, id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    }
  },

  async updateDocument(path: string, id: string, data: any) {
    try {
      await updateDoc(doc(db, path, id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
    }
  },

  async addDocument(path: string, data: any) {
    try {
      const docRef = await addDoc(collection(db, path), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteDocument(path: string, id: string) {
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  },

  async getCollection(path: string, constraints: QueryConstraint[] = []) {
    try {
      const q = query(collection(db, path), ...constraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  subscribeToDocument(path: string, id: string, callback: (data: any) => void) {
    const docRef = doc(db, path, id);
    return onSnapshot(docRef, (doc) => {
      callback(doc.exists() ? { id: doc.id, ...doc.data() } : null);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
    });
  },

  subscribeToCollection(path: string, constraints: QueryConstraint[], callback: (data: any[]) => void) {
    const q = query(collection(db, path), ...constraints);
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async updateWalletBalance(uid: string, currency: string, balanceDelta: number, lockedDelta: number) {
    const walletId = `${uid}_${currency}`;
    const walletRef = doc(db, 'wallets', walletId);
    try {
      const snap = await getDoc(walletRef);
      if (snap.exists()) {
        const data = snap.data();
        await updateDoc(walletRef, {
          balance: (data.balance || 0) + balanceDelta,
          pendingLocked: (data.pendingLocked || 0) + lockedDelta,
          updatedAt: new Date().toISOString()
        });
      } else if (balanceDelta > 0) {
        await setDoc(walletRef, {
          uid,
          currency,
          balance: balanceDelta,
          pendingLocked: lockedDelta,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `wallets/${walletId}`);
    }
  },

  async uploadFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
