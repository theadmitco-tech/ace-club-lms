'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { AdminDraftNavigationProvider, useAdminDraftNavigation } from '@/components/AdminDraftNavigation';
import { useAuth } from '@/lib/AuthContext';
import './admin.css';
import './workflow.css';

type AdminShellProps = { children: React.ReactNode; showCoursePublishing?: boolean; workflowEnabled?: boolean; paymentsEnabled?: boolean };

export default function AdminShell({ children, showCoursePublishing = false, workflowEnabled = false, paymentsEnabled = false }: AdminShellProps) {
  return <AdminDraftNavigationProvider><AdminShellContent paymentsEnabled={paymentsEnabled} workflowEnabled={workflowEnabled} showCoursePublishing={showCoursePublishing}>{children}</AdminShellContent></AdminDraftNavigationProvider>;
}

function AdminShellContent({ children, showCoursePublishing = false, workflowEnabled = false, paymentsEnabled = false }: AdminShellProps) {
  const { confirmLeave } = useAdminDraftNavigation();
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarToggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSidebarOpen(false);
      sidebarToggle.current?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    } else if (!isLoading && user?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="admin-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const primaryItems = [
    { href: '/admin/v2/content', label: 'Course content', icon: '▤' },
    { href: '/admin/v2/batches', label: 'Batches', icon: '▦' },
    { href: '/admin/v2/students', label: 'Students', icon: '○' },
  ];
  const moreItems = [
    ...(paymentsEnabled ? [{ href: '/admin/v2/payments', label: 'Payment review' }] : []),
    { href: '/admin/v2/access', label: 'Prices & purchase history' },
    { href: '/admin/users', label: 'Account management' },
    { href: '/admin/progress', label: 'Student progress' },
    { href: '/admin/templates', label: 'Existing templates' },
    { href: '/admin/curriculum', label: 'Master curriculum' },
    { href: '/admin/resources', label: 'Existing resources' },
    { href: '/admin/sessions', label: 'Existing sessions' },
    { href: '/admin/courses', label: 'Existing batches' },
  ];
  const navItems = workflowEnabled ? primaryItems : [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    ...(showCoursePublishing ? [{ href: '/admin/v2', label: 'Course publishing', icon: '📖' }] : []),
    { href: '/admin/templates', label: 'Course templates', icon: '🧩' },
    { href: '/admin/curriculum', label: 'Full Course Master Base', icon: '🏛️' },
    { href: '/admin/resources', label: 'Resources', icon: '📚' },
    { href: '/admin/sessions', label: 'Sessions', icon: '📋' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/courses', label: 'Batches', icon: '📚' },
    { href: '/admin/progress', label: 'Student progress', icon: '✅' },
  ];

  return (
    <div className={`admin-layout ${workflowEnabled ? 'admin-workflow' : ''}`}>
      <a className="admin-skip-link" href="#admin-main">Skip to workspace</a>
      {/* Sidebar */}
      <aside id="admin-navigation" className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <BrandLogo
              variant={workflowEnabled ? "dark" : "light"}
              className="sidebar-brand-logo"
              alt="The Ace Club by The Admit Co."
              preload
            />
          </div>
          <span className="badge badge-admin">Admin</span>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          {navItems.map((item) => (
            <button
              key={item.href}
              aria-current={pathname === item.href || (item.href !== '/admin' && (pathname.startsWith(item.href + '/') || (workflowEnabled && item.href === '/admin/v2/content' && (pathname.startsWith('/admin/v2/templates') || pathname.startsWith('/admin/v2/imports'))))) ? 'page' : undefined}
              className={`sidebar-nav-item ${(pathname === item.href || (item.href !== '/admin' && (pathname.startsWith(item.href + '/') || (workflowEnabled && item.href === '/admin/v2/content' && (pathname.startsWith('/admin/v2/templates') || pathname.startsWith('/admin/v2/imports')))))) ? 'active' : ''}`}
              onClick={() => {
                if (!confirmLeave()) return;
                router.push(item.href);
                setSidebarOpen(false);
              }}
            >
              <span className="sidebar-nav-icon" aria-hidden="true">{workflowEnabled ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{item.href === '/admin/v2/content' ? <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></> : item.href === '/admin/v2/batches' ? <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M7 15h3m4 0h3"/></> : <><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/></>}</svg> : item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        {workflowEnabled && <details className="admin-more-tools"><summary>More tools</summary><nav aria-label="Additional Admin tools">{moreItems.map(item => <button key={item.href} type="button" aria-current={pathname === item.href ? 'page' : undefined} onClick={() => { if (confirmLeave()) { router.push(item.href); setSidebarOpen(false); } }}>{item.label}</button>)}</nav></details>}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden="true">{workflowEnabled ? '○' : 'AA'}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.full_name}</span>
              <span className="sidebar-user-email">{user.email}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { if (confirmLeave()) void logout(); }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <button
        ref={sidebarToggle}
        type="button"
        className="admin-sidebar-toggle"
        aria-label={sidebarOpen ? 'Close admin navigation' : 'Open admin navigation'}
        aria-expanded={sidebarOpen}
        aria-controls="admin-navigation"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main id="admin-main" className="admin-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
