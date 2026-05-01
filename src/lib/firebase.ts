// Fake Firebase to avoid crashes after Supabase migration
export const auth = {
  currentUser: null,
  onAuthStateChanged: () => () => {},
  signInWithEmailAndPassword: async () => { throw new Error('Use Supabase instead'); },
  signOut: async () => {},
} as any;

export const db = {} as any;
export const googleProvider = {} as any;

export default {};
