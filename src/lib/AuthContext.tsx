'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Toast } from '@/lib/types';
import { mockLogin } from '@/lib/mockData';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Check for saved session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('ace_club_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('ace_club_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockLogin(email);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('ace_club_user', JSON.stringify(foundUser));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('ace_club_user');
  }, []);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, toasts, addToast, removeToast }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
