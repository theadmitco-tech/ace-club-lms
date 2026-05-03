'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [authMethod, setAuthMethod] = useState<'magic' | 'password'>('magic');
  
  const { user, login, loginWithPassword, isLoading } = useAuth();
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

    let result;
    if (authMethod === 'password') {
      if (!password) {
        setError('Please enter your password');
        setIsSubmitting(false);
        return;
      }
      result = await loginWithPassword(email, password);
    } else {
      result = await login(email);
    }
    
    if (result.success) {
      if (authMethod === 'magic') {
        setShowSuccess(true);
      }
      // Password login will trigger the useEffect redirect
    } else {
      setError(result.error || 'Failed to sign in. Please try again.');
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
                <path d="M16 2L30 9V23L16 30L2 23V9L16 2Z" fill="#003b30" stroke="#003b30" strokeWidth="1.5"/>
                <path d="M16 8L24 12.5V21.5L16 26L8 21.5V12.5L16 8Z" fill="#0f5a4c"/>
                <text x="16" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A</text>
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
              <p>We&apos;ve sent a magic login link to your email address.</p>
              <p style={{ fontSize: '13px', marginTop: '12px', color: 'var(--text-tertiary)' }}>
                You can close this window.
              </p>
            </div>
          ) : (
            <>
              <h2 className="login-title">Sign in to continue</h2>
              
              <div className="login-method-tabs">
                <button 
                  className={`method-tab ${authMethod === 'magic' ? 'active' : ''}`}
                  onClick={() => setAuthMethod('magic')}
                >
                  Magic Link
                </button>
                <button 
                  className={`method-tab ${authMethod === 'password' ? 'active' : ''}`}
                  onClick={() => setAuthMethod('password')}
                >
                  Password
                </button>
              </div>

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

                {authMethod === 'password' && (
                  <div className="form-group animate-fade-in">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input
                      id="password"
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      autoComplete="current-password"
                    />
                  </div>
                )}

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
                    authMethod === 'magic' ? 'Send Magic Link' : 'Sign In'
                  )}
                </button>
              </form>

              <div className="login-divider">
                <span>Quick Access (Demo)</span>
              </div>

              <div className="login-demo-accounts">
                <button
                  className="login-demo-btn"
                  onClick={() => {
                    setEmail('student@aceclub.in');
                    setPassword('StudentPassword123!');
                    setAuthMethod('password');
                  }}
                >
                  <span className="login-demo-avatar">TS</span>
                  <div>
                    <div className="login-demo-name">Test Student</div>
                    <div className="login-demo-role">Student Account</div>
                  </div>
                </button>
                <button
                  className="login-demo-btn"
                  onClick={() => {
                    setEmail('admin@aceclub.in');
                    setPassword('AdminPassword123!');
                    setAuthMethod('password');
                  }}
                >
                  <span className="login-demo-avatar admin">SA</span>
                  <div>
                    <div className="login-demo-name">Super Admin</div>
                    <div className="login-demo-role">Admin Account</div>
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
