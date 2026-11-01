import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '@/api/supabase';
import { queryClientInstance } from './query-client';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoadingAuth, setLoading] = useState(true);
  const [authError, setError] = useState(null);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    let currentId = null;
    const apply = (next) => {
      if (!mounted) return;
      if (currentId !== (next?.user.id ?? null)) queryClientInstance.clear();
      currentId = next?.user.id ?? null;
      setSession(next);
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setError(error);
      apply(data.session);
    }).catch(error => { if (mounted) { setError(error); setLoading(false); } });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      apply(next);
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);
  const checkUserAuth = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.getSession();
    if (error) setError(error);
    setSession(data.session); setLoading(false);
  }, []);
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    queryClientInstance.clear(); setSession(null); setRecovery(false);
  };
  const raw = session?.user;
  const user = raw ? { ...raw, full_name: raw.user_metadata?.full_name || raw.email, role: 'user' } : null;
  return <AuthContext.Provider value={{ user, session, isAuthenticated: !!session,
    isLoadingAuth, authChecked: !isLoadingAuth, authError, isConfigured,
    recovery, clearRecovery: () => setRecovery(false), logout, checkUserAuth }}>
    {children}
  </AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider ausente.');
  return value;
}
