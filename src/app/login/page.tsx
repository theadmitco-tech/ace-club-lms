'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { user, login, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email.trim()) {
      setError('Please enter your email address');
      setIsSubmitting(false);
      return;
    }

    const result = await login(email);
    
    if (result.success) {
      setShowSuccess(true);
    } else {
      setError(result.error || 'Failed to send login link. Please try again.');
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
      {/* Background effects */}
      <div className="login-bg-gradient" />
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-grid" />

      <div className="login-container animate-fade-in-up">
        {/* Logo & Brand */}
        <div className="login-header">
          <div className="login-logo">
            <div className="login-logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L30 9V23L16 30L2 23V9L16 2Z" fill="url(#logo-grad)" fillOpacity="0.2" stroke="url(#logo-grad)" strokeWidth="1.5"/>
                <path d="M16 8L24 12.5V21.5L16 26L8 21.5V12.5L16 8Z" fill="url(#logo-grad)" fillOpacity="0.4"/>
                <text x="16" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A</text>
                <defs>
                  <linearGradient id="logo-grad" x1="2" y1="2" x2="30" y2="30">
                    <stop offset="0%" stopColor="#4F7CFF"/>
                    <stop offset="100%" stopColor="#7C3AED"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="login-brand">Ace Club</h1>
          </div>
          <p className="login-subtitle">GMAT Learning Platform</p>
        </div>

        {/* Login Card */}
        <div className="login-card glass-card">
          {showSuccess ? (
            <div className="login-success animate-fade-in-up">
              <div className="login-success-icon">✓</div>
              <h2>Check your inbox!</h2>
              <p>We've sent a magic login link to your email address.</p>
              <p style={{ fontSize: '13px', marginTop: '12px', color: 'var(--text-tertiary)' }}>
                You can close this window.
              </p>
            </div>
          ) : (
            <>
              <h2 className="login-title">Sign in to continue</h2>
              <p className="login-description">
                Enter the email address associated with your Ace Club account.
              </p>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <div className="login-error animate-fade-in">
                    <span className="login-error-icon">⚠</span>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg login-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner" />
                      Signing in...
                    </>
                  ) : (
                    'Continue with Email'
                  )}
                </button>
              </form>

              <div className="login-divider">
                <span>Demo Accounts</span>
              </div>

              <div className="login-demo-accounts">
                <button
                  className="login-demo-btn"
                  onClick={() => setEmail('student@aceclub.in')}
                >
                  <span className="login-demo-avatar">RS</span>
                  <div>
                    <div className="login-demo-name">Rahul Sharma</div>
                    <div className="login-demo-role">Student</div>
                  </div>
                </button>
                <button
                  className="login-demo-btn"
                  onClick={() => setEmail('admin@aceclub.in')}
                >
                  <span className="login-demo-avatar admin">AA</span>
                  <div>
                    <div className="login-demo-name">Ace Admin</div>
                    <div className="login-demo-role">Admin</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="login-footer">
          Don&apos;t have an account? Contact the Ace Club team.
        </p>
      </div>
    </div>
  );
}
