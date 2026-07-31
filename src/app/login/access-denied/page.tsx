import Link from 'next/link';
import '../login.css';

export default function AccessDeniedPage() {
  return (
    <main className="login-page">
      <section className="login-card glass-card">
        <h1 className="login-title">Portal access is not active</h1>
        <p className="login-subtitle">
          Use the Google account approved for Ace Club, or contact the programme team for help.
        </p>
        <Link className="btn btn-primary btn-lg login-btn" href="/login">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
