'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SignOutButton() {
  const { logout, addToast } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error('Student sign out failed:', error);
      addToast('error', 'Sign out failed. Please retry.');
      setIsSigningOut(false);
    }
  };

  return (
    <button
      className="student-sign-out"
      type="button"
      disabled={isSigningOut}
      onClick={() => void handleSignOut()}
    >
      {isSigningOut ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
