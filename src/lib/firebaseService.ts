import { supabaseService, where, orderBy, limit, serverTimestamp, OperationType } from './supabaseService';

export { where, orderBy, limit, serverTimestamp, OperationType };
export const firebaseService = supabaseService;
export const db = 'supabase'; 

// Mock Firestore functions to redirect to Supabase
export const collection = (db: any, ...pathParts: string[]) => {
  if (typeof db === 'string' && !pathParts.length) return db; // Handle case where db is actually the path
  return pathParts.join('/');
};
export const doc = (db: any, path: string, id?: string) => {
  if (typeof db === 'string') return id ? `${db}/${path}/${id}` : `${db}/${path}`;
  return id ? `${path}/${id}` : path;
};

export const query = (path: any, ...constraints: any[]) => ({ path, constraints });

export const onSnapshot = (q: any, callback: (snapshot: any) => void, errorCallback?: (error: any) => void) => {
  console.log('[Shim] onSnapshot called for:', q);
  const path = typeof q === 'string' ? q : q.path;
  const constraints = typeof q === 'string' ? [] : q.constraints;

  const parts = path.split('/');
  if (parts.length === 2 || parts.length === 4) {
    // It's a doc path (users/123 or apps/app1/users/123)
    return supabaseService.subscribeToDocument(path, parts[parts.length - 1], (data) => {
      callback({ exists: () => !!data, data: () => data, id: data?.id || parts[parts.length - 1] });
    });
  }
  
  // It's a query object or collection path
  return supabaseService.subscribeToCollection(path, constraints, (data) => {
    const docs = data.map(d => ({
      id: d.uid || d.id,
      data: () => d,
      exists: () => true
    }));
    callback({
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (cb: any) => docs.forEach(cb),
      map: (cb: any) => docs.map(cb)
    });
  });
};

export const getDocs = async (q: any) => {
  const path = typeof q === 'string' ? q : q.path;
  const constraints = typeof q === 'string' ? [] : q.constraints;
  const data = await supabaseService.getCollection(path, constraints);
  const docs = data.map(d => ({
    id: d.uid || d.id,
    data: () => d,
    exists: () => true
  }));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (cb: any) => docs.forEach(cb),
    map: (cb: any) => docs.map(cb)
  };
};

export const addDoc = (colPath: string, data: any) => supabaseService.addDocument(colPath, data);

export const getDocFromCache = async (pathOrDoc: any) => {
  const path = typeof pathOrDoc === 'string' ? pathOrDoc : pathOrDoc.path;
  const parts = path.split('/');
  const { data } = await supabaseService.getDocument(parts[0], parts[1]);
  return { exists: () => !!data, data: () => data };
};
export const getDocFromServer = getDocFromCache;
export const getDoc = getDocFromCache;

export const setDoc = async (pathOrDoc: any, data: any) => {
  const path = typeof pathOrDoc === 'string' ? pathOrDoc : pathOrDoc.path;
  const parts = path.split('/');
  return supabaseService.setDocument(parts[0], parts[1], data);
};

export const updateDoc = async (pathOrDoc: any, data: any) => {
  const path = typeof pathOrDoc === 'string' ? pathOrDoc : pathOrDoc.path;
  const parts = path.split('/');
  return supabaseService.updateDocument(parts[0], parts[1], data);
};

export const deleteDoc = async (pathOrDoc: any) => {
  const path = typeof pathOrDoc === 'string' ? pathOrDoc : pathOrDoc.path;
  const parts = path.split('/');
  return supabaseService.deleteDocument(parts[0], parts[1]);
};

// Basic runTransaction shim for Supabase
export const runTransaction = async (db: any, updateFunction: (transaction: any) => Promise<any>) => {
  const transaction = {
    get: async (pathOrDoc: any) => {
      const path = typeof pathOrDoc === 'string' ? pathOrDoc : pathOrDoc.path;
      const parts = path.split('/');
      const { data } = await supabaseService.getDocument(parts[0], parts[1]);
      return { exists: () => !!data, data: () => data };
    },
    update: async (pathOrDoc: any, data: any) => {
      const path = typeof pathOrDoc === 'string' ? pathOrDoc : pathOrDoc.path;
      const parts = path.split('/');
      return supabaseService.updateDocument(parts[0], parts[1], data);
    },
    set: async (pathOrDoc: any, data: any) => {
      const path = typeof pathOrDoc === 'string' ? pathOrDoc : pathOrDoc.path;
      const parts = path.split('/');
      return supabaseService.setDocument(parts[0], parts[1], data);
    }
  };
  return updateFunction(transaction);
};
