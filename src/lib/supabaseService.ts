import { supabase } from './supabase';
import { toast } from 'sonner';

export { supabase };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Helpers to mimic Firestore constraints
export const where = (column: string, operator: string, value: any) => ({ type: 'where', column, operator, value });
export const orderBy = (column: string, direction: 'asc' | 'desc' = 'asc') => ({ type: 'orderBy', column, direction });
export const limit = (count: number) => ({ type: 'limit', count });
export const serverTimestamp = () => new Date().toISOString();

// Utility to convert object keys
const camelToSnake = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc: any, key) => {
      // Special cases for common fields to avoid weird conversions like photo_u_r_l (from photoURL)
      let snakeKey: string;
      if (key === 'photoUrl' || key === 'photoURL') {
        snakeKey = 'photo_url';
      } else if (key === 'phoneNumber') {
        snakeKey = 'phone_number';
      } else if (key === 'accountNumber') {
        snakeKey = 'account_number';
      } else if (key === 'kycStatus') {
        snakeKey = 'kyc_status';
      } else if (key === 'displayName') {
        snakeKey = 'display_name';
      } else if (key === 'fullName') {
        snakeKey = 'full_name';
      } else if (key === 'passportNumber') {
        snakeKey = 'passport_number';
      } else if (key === 'referralCode') {
        snakeKey = 'referral_code';
      } else if (key === 'passportImage') {
        snakeKey = 'passport_image';
      } else if (key === 'selfieImage') {
        snakeKey = 'selfie_image';
      } else if (key === 'kycData') {
        snakeKey = 'kyc_data';
      } else {
        snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      }
      acc[snakeKey] = camelToSnake(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

const snakeToCamel = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc: any, key) => {
      // Manual overrides for snake to camel
      let camelKey: string;
      if (key === 'photo_url') {
        camelKey = 'photoURL';
      } else if (key === 'phone_number') {
        camelKey = 'phoneNumber';
      } else if (key === 'account_number') {
        camelKey = 'accountNumber';
      } else if (key === 'kyc_status') {
        camelKey = 'kycStatus';
      } else if (key === 'display_name') {
        camelKey = 'displayName';
      } else if (key === 'full_name') {
        camelKey = 'fullName';
      } else if (key === 'passport_number') {
        camelKey = 'passportNumber';
      } else if (key === 'referral_code') {
        camelKey = 'referralCode';
      } else {
        camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
      }
      acc[camelKey] = snakeToCamel(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

export const supabaseService = {
  // Simple path to table mapper
  // "chats/123/messages" -> { table: "chats_messages", filter: "chatId=eq.123" }
  resolvePath(path: string) {
    const parts = path.split('/');
    let table = path;
    let parentFilter: { column: string; value: string } | null = null;
    let pkName = 'id';

    if (parts.length === 3) {
      const parentTable = parts[0];
      const parentId = parts[1];
      // Map chats/UID/messages to chat_messages table with chat_id filter
      table = `${parentTable.slice(0, -1)}_messages`;
      parentFilter = { column: `${parentTable.slice(0, -1)}_id`, value: parentId };
    }

    // Manual overrides for standard collections used in the app
    const overrides: Record<string, string> = {
      'adminSettings': 'admin_settings',
      'chat_messages': 'chat_messages',
      'transactions': 'transactions',
      'notifications': 'notifications',
      'wallets': 'wallets',
      'users': 'users',
      'kyc_requests': 'kyc_requests',
      'kycSubmissions': 'kyc_submissions',
      'sub_admin_login_attempts': 'sub_admin_login_attempts'
    };

    if (overrides[table]) {
      table = overrides[table];
    } else if (!table.includes('_') && table !== 'chats' && table !== 'rates' && table !== 'users') {
      // Auto snake_case if not already handled
      table = table.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    // Set primary key name
    if (table === 'users') {
      pkName = 'uid';
    } else if (table === 'sub_admin_login_attempts') {
      pkName = 'username';
    }

    return { table, parentFilter, pkName };
  },

  async getDocument(path: string, id: string) {
    try {
      const { table, pkName } = this.resolvePath(path);
      const { data, error } = await (supabase as any)
        .from(table)
        .select('*')
        .eq(pkName, id)
        .maybeSingle();
      
      if (error) throw error;
      return { data: snakeToCamel(data), error: null };
    } catch (error: any) {
      console.error(`Supabase Error [GET] ${path}/${id}:`, error);
      return { data: null, error };
    }
  },

  async setDocument(path: string, id: string, data: any) {
    try {
      const { table, parentFilter, pkName } = this.resolvePath(path);
      const payload = { ...camelToSnake(data) };
      payload[pkName] = id;
      
      if (parentFilter) {
        payload[parentFilter.column] = parentFilter.value;
      }
      const { error } = await (supabase as any)
        .from(table)
        .upsert(payload, { onConflict: pkName });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Supabase Error [SET] ${path}/${id}:`, error);
      return false;
    }
  },

  async updateDocument(path: string, id: string, data: any) {
    try {
      const { table, pkName } = this.resolvePath(path);
      console.log(`[Supabase] Updating ${table}/${id} with:`, camelToSnake(data));
      const { error } = await (supabase as any)
        .from(table)
        .update(camelToSnake(data))
        .eq(pkName, id);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Supabase Error [UPDATE] ${path}/${id}:`, error);
    }
  },

  async addDocument(path: string, data: any) {
    try {
      const { table, parentFilter, pkName } = this.resolvePath(path);
      const payload = { ...camelToSnake(data) };
      if (parentFilter) {
        payload[parentFilter.column] = parentFilter.value;
      }
      
      console.log(`[Supabase] Adding to ${table}:`, payload);
      
      const { data: result, error } = await (supabase as any)
        .from(table)
        .insert(payload)
        .select(pkName);
      
      if (error) {
        console.error(`[Supabase] Insert Error [${table}]:`, error);
        // Display toast to help user identify missing tables
        if (error.code === '42P01') {
          toast.error(`Database table "${table}" not found. Please run the SQL setup script.`);
        } else if (error.code === '42501') {
          toast.error(`Permission denied on "${table}". Check your RLS policies.`);
        } else {
          toast.error(`Database error: ${error.message}`);
        }
        return null;
      }
      
      if (!result || result.length === 0) {
        console.warn(`[Supabase] Insert [${table}] returned no data. Check RLS policies.`);
        return null;
      }
      return result[0][pkName];
    } catch (error) {
      console.error(`[Supabase] Exception [CREATE] ${path}:`, error);
      return null;
    }
  },

  async deleteDocument(path: string, id: string) {
    try {
      const { table, pkName } = this.resolvePath(path);
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq(pkName, id);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Supabase Error [DELETE] ${path}/${id}:`, error);
    }
  },

  async getCollection(path: string, constraints: any[] = []) {
    try {
      const { table, parentFilter } = this.resolvePath(path);
      let queryBuilder = ((supabase as any).from(table).select('*') as any);
      
      if (parentFilter) {
        queryBuilder = queryBuilder.eq(parentFilter.column, parentFilter.value);
      }

      constraints.forEach((c: any) => {
        if (!c) return;
        if (c.type === 'where') {
          const { column, operator, value } = c;
          // Convert column to snake_case for query
          const dbColumn = column.replace(/[A-Z]/g, (l: string) => `_${l.toLowerCase()}`);
          if (operator === '==' || operator === '===') queryBuilder = queryBuilder.eq(dbColumn, value);
          else if (operator === '!=') queryBuilder = queryBuilder.neq(dbColumn, value);
          else if (operator === '>') queryBuilder = queryBuilder.gt(dbColumn, value);
          else if (operator === '>=') queryBuilder = queryBuilder.gte(dbColumn, value);
          else if (operator === '<') queryBuilder = queryBuilder.lt(dbColumn, value);
          else if (operator === '<=') queryBuilder = queryBuilder.lte(dbColumn, value);
          else if (operator === 'in') queryBuilder = queryBuilder.in(dbColumn, value);
          else if (operator === 'array-contains') queryBuilder = queryBuilder.contains(dbColumn, [value]);
        } else if (c.type === 'orderBy') {
          const dbColumn = c.column.replace(/[A-Z]/g, (l: string) => `_${l.toLowerCase()}`);
          queryBuilder = queryBuilder.order(dbColumn, { ascending: c.direction === 'asc' });
        } else if (c.type === 'limit') {
          queryBuilder = queryBuilder.limit(c.count);
        }
      });

      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      return snakeToCamel(data) || [];
    } catch (error) {
      console.error(`Supabase Error [LIST] ${path}:`, error);
      return [];
    }
  },

  subscribeToDocument(path: string, id: string, callback: (data: any) => void) {
    const { table, pkName } = this.resolvePath(path);
    const channel = (supabase as any)
      .channel(`${table}:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `${pkName}=eq.${id}` },
        (payload: any) => {
          callback(snakeToCamel(payload.new));
        }
      )
      .subscribe();

    this.getDocument(path, id).then(({ data }: any) => callback(data));
    return () => (supabase as any).removeChannel(channel);
  },

  subscribeToCollection(path: string, constraints: any[], callback: (data: any[]) => void) {
    const { table } = this.resolvePath(path);
    const channel = (supabase as any)
      .channel(`${table}:list:${Math.random()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          this.getCollection(path, constraints).then(callback);
        }
      )
      .subscribe();

    this.getCollection(path, constraints).then(callback);
    return () => (supabase as any).removeChannel(channel);
  },

  async updateWalletBalance(uid: string, currency: string, balanceDelta: number, lockedDelta: number) {
    const walletId = `${uid}_${currency}`;
    try {
      const { data: wallet } = await (supabase as any)
        .from('wallets')
        .select('*')
        .eq('id', walletId)
        .maybeSingle();

      if (wallet) {
        await (supabase as any)
          .from('wallets')
          .update({
            balance: (wallet.balance || 0) + balanceDelta,
            pending_locked: (wallet.pending_locked || 0) + lockedDelta,
            updated_at: new Date().toISOString()
          })
          .eq('id', walletId);
      } else if (balanceDelta > 0) {
        await (supabase as any)
          .from('wallets')
          .insert({
            id: walletId,
            uid,
            currency,
            balance: balanceDelta,
            pending_locked: lockedDelta,
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error(`Supabase Error [Update Wallet] ${walletId}:`, error);
    }
  },

  async uploadFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Auth Helpers
  async signUp(email: string, password: string, options?: any) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: options?.data || {}
      }
    });
  },

  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  },

  async signInWithGoogle() {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
  },

  async signOut() {
    return await supabase.auth.signOut();
  }
};
