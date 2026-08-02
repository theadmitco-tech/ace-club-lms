'use client';

import { useAuth } from '@/lib/AuthContext';

export function SignOutButton() {
  const { logout } = useAuth();

  return (
    <button className="student-sign-out" type="button" onClick={() => void logout()}>
      Sign out
    </button>
  );
}
