'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { User, Toast } from '@/lib/types';
import { createClient, hasSupabaseConfig } from '@/utils/supabase/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_INIT_TIMEOUT_MS = 8000;

function SupabaseSetupRequired() {
  return (
    <main style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
      background: 'var(--bg-primary)',
    }}>
      <section className="glass-card" style={{ maxWidth: '680px', padding: '32px' }}>
        <p style={{ color: 'var(--warning)', fontWeight: 700, marginBottom: '8px' }}>
          Supabase setup required
        </p>
        <h1 style={{ fontSize: '28px', lineHeight: 1.2, marginBottom: '16px' }}>
          Add your local Supabase environment variables.
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          The app needs these public values before it can load auth, admin pages, or course data.
        </p>
        <pre style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-primary)',
          overflowX: 'auto',
        }}>{`NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}</pre>
        <p style={{ color: 'var(--text-tertiary)', marginTop: '20px', fontSize: '14px' }}>
          Put them in <code>.env.local</code>, then restart the dev server.
        </p>
      </section>
    </main>
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isSupabaseConfigured = hasSupabaseConfig();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Use a stable reference for the Supabase client to prevent lock contention
  const [supabase] = useState(() => isSupabaseConfigured ? createClient() : null);

  const loadUserFromSession = useCallback(async (session: Session | null) => {
    if (!supabase) return;

    if (!session?.user) {
      setUser(null);
      return;
    }

    // Fetch custom profile details from public.profiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      setUser(profile as User);
      return;
    }

    if (error) {
      console.warn('Profile fetch failed; using auth metadata fallback.', error);
    }

    // Fallback if profile trigger failed/delayed
    setUser({
      id: session.user.id,
      email: session.user.email || '',
      full_name: session.user.user_metadata?.full_name || 'Student',
      role: 'student',
      created_at: session.user.created_at
    });
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const fetchUser = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_INIT_TIMEOUT_MS,
          'Auth initialization timed out'
        );

        if (isMounted) {
          await loadUserFromSession(session);
        }
      } catch (error) {
        console.error('Failed to initialize auth session:', error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUser();

    // Listen for auth state changes (login/logout/magic link click)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setIsLoading(true);
        window.setTimeout(() => {
          loadUserFromSession(session)
            .catch((error) => {
              console.error('Failed to sync auth profile:', error);
              setUser(null);
            })
            .finally(() => setIsLoading(false));
        }, 0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserFromSession, supabase]);

  const login = useCallback(async (email: string) => {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redirect back to dashboard after clicking magic link
        emailRedirectTo: window.location.origin + '/dashboard',
      },
    });

    setIsLoading(false);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }, [supabase]);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }, [supabase]);

  const logout = useCallback(async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
  }, [supabase]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return isSupabaseConfigured ? (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithPassword, logout, toasts, addToast, removeToast }}>
      {children}
    </AuthContext.Provider>
  ) : (
    <SupabaseSetupRequired />
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
