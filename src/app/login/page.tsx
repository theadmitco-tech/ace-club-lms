'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import './login.css';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loginWithGoogle, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, isLoading, router]);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    const result = await loginWithGoogle();

    if (!result.success) {
      setError('Google Sign-In could not be started. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg-gradient" />
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-grid" />

      <div className="login-container animate-fade-in-up">
        <div className="login-header">
          <div className="login-logo">
            <div className="login-logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M16 2L30 9V23L16 30L2 23V9L16 2Z" fill="#003b30" stroke="#003b30" strokeWidth="1.5"/>
                <path d="M16 8L24 12.5V21.5L16 26L8 21.5V12.5L16 8Z" fill="#0f5a4c"/>
                <text x="16" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A</text>
              </svg>
            </div>
            <h1 className="login-brand">Ace Club</h1>
          </div>
          <p className="login-subtitle">GMAT Learning Platform</p>
        </div>

        <div className="login-card glass-card">
          <h2 className="login-title">Sign in to continue</h2>
          <p className="login-subtitle">
            Use the Google account approved for your Ace Club access.
          </p>

          {error && (
            <div className="login-error" role="alert">
              <span className="login-error-icon" aria-hidden="true">⚠</span>
              {error}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-lg login-btn"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="spinner" />
                Connecting...
              </>
            ) : (
              'Continue with Google'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
