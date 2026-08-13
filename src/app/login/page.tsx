'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
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
            <BrandLogo
              variant="light"
              className="login-brand-logo"
              alt="The Ace Club by The Admit Co."
              preload
            />
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
