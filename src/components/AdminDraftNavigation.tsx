'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ComponentProps, type ReactNode } from 'react';
import Link from 'next/link';

type DraftNavigation = {
  register: () => () => void;
  confirmLeave: () => boolean;
};

const DraftNavigationContext = createContext<DraftNavigation | null>(null);

export function AdminDraftNavigationProvider({ children }: { children: ReactNode }) {
  const drafts = useRef(new Set<symbol>());
  const register = useCallback(() => {
    const token = Symbol();
    drafts.current.add(token);
    return () => { drafts.current.delete(token); };
  }, []);
  const confirmLeave = useCallback(() => drafts.current.size === 0
    || window.confirm('Leave this page? Unsaved edits or an unconfirmed save may be lost.'), []);
  const value = useMemo(() => ({ register, confirmLeave }), [register, confirmLeave]);
  return <DraftNavigationContext.Provider value={value}>{children}</DraftNavigationContext.Provider>;
}

export function useAdminDraftNavigation() {
  const context = useContext(DraftNavigationContext);
  if (!context) throw new Error('Admin draft navigation requires its provider.');
  return context;
}

export function useAdminDraftGuard(hasUnsavedChanges: boolean) {
  const { register } = useAdminDraftNavigation();
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const unregister = register();
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => {
      unregister();
      window.removeEventListener('beforeunload', warn);
    };
  }, [hasUnsavedChanges, register]);
}

export function AdminDraftLink({ onNavigate, ...props }: ComponentProps<typeof Link>) {
  const { confirmLeave } = useAdminDraftNavigation();
  return <Link {...props} onNavigate={(event) => {
    if (!confirmLeave()) {
      event.preventDefault();
      return;
    }
    onNavigate?.(event);
  }} />;
}
