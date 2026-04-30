import { supabaseService, where, orderBy, limit, serverTimestamp, OperationType } from './supabaseService';

export { where, orderBy, limit, serverTimestamp, OperationType };
export const firebaseService = supabaseService;
export const db = 'supabase'; // Dummy placeholder to avoid "db not found" errors

// Mock Firestore functions to redirect to Supabase
export const collection = (db: any, ...pathParts: string[]) => pathParts.join('/');
export const doc = (db: any, path: string, id?: string) => id ? `${path}/${id}` : path;

export const query = (path: any, ...constraints: any[]) => ({ path, constraints });

export const onSnapshot = (q: any, callback: (snapshot: any) => void, errorCallback?: (error: any) => void) => {
  if (typeof q === 'string') {
    // It's a doc path
    const parts = q.split('/');
    return supabaseService.subscribeToDocument(parts[0], parts[1], (data) => {
      callback({ exists: () => !!data, data: () => data, id: data?.id });
    });
  }
  
  // It's a query object
  return supabaseService.subscribeToCollection(q.path, q.constraints, (data) => {
    const docs = data.map(d => ({
      id: d.id,
      data: () => d,
      exists: () => true
    }));
    callback({
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (cb: any) => docs.forEach(cb)
    });
  });
};

export const addDoc = (colPath: string, data: any) => supabaseService.addDocument(colPath, data);

export const getDocFromCache = async (path: any) => {
  const parts = path.split('/');
  const { data } = await supabaseService.getDocument(parts[0], parts[1]);
  return { exists: () => !!data, data: () => data };
};
export const getDocFromServer = getDocFromCache;

export const getDoc = getDocFromCache;

// Basic runTransaction shim for Supabase
export const runTransaction = async (db: any, updateFunction: (transaction: any) => Promise<any>) => {
  const transaction = {
    get: async (path: any) => {
      const parts = path.split('/');
      const { data } = await supabaseService.getDocument(parts[0], parts[1]);
      return { exists: () => !!data, data: () => data };
    },
    update: async (path: any, data: any) => {
      const parts = path.split('/');
      return supabaseService.updateDocument(parts[0], parts[1], data);
    },
    set: async (path: any, data: any) => {
      const parts = path.split('/');
      return supabaseService.setDocument(parts[0], parts[1], data);
    }
  };
  return updateFunction(transaction);
};
