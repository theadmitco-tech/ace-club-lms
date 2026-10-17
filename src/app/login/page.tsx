'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/lib/AuthContext';
import './login.css';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localEmail, setLocalEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const { user, loginWithGoogle, loginWithPassword, isLoading } = useAuth();
  const router = useRouter();
  const localPasswordLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_LOCAL_PASSWORD_LOGIN === 'true';

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.role === 'admin' ? '/admin' : '/post-login');
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

  const handleLocalSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await loginWithPassword(localEmail, localPassword);
    if (!result.success) {
      setError(result.error ?? 'Local sign-in failed.');
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
          {localPasswordLoginEnabled && (
            <>
              <div className="login-divider"><span>Local QA only</span></div>
              <form className="login-form" onSubmit={handleLocalSignIn}>
                <label>Email<input autoComplete="username" onChange={(event) => setLocalEmail(event.target.value)} required type="email" value={localEmail} /></label>
                <label>Password<input autoComplete="current-password" onChange={(event) => setLocalPassword(event.target.value)} required type="password" value={localPassword} /></label>
                <button className="btn btn-secondary btn-lg login-btn" disabled={isSubmitting} type="submit">Sign in to local fixture</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
