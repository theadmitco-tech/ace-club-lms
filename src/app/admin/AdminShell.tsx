'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { AdminDraftNavigationProvider, useAdminDraftNavigation } from '@/components/AdminDraftNavigation';
import { useAuth } from '@/lib/AuthContext';
import './admin.css';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return <AdminDraftNavigationProvider><AdminShellContent>{children}</AdminShellContent></AdminDraftNavigationProvider>;
}

function AdminShellContent({ children }: { children: React.ReactNode }) {
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

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/templates', label: 'Course templates', icon: '🧩' },
    { href: '/admin/curriculum', label: 'Full Course Master Base', icon: '🏛️' },
    { href: '/admin/resources', label: 'Resources', icon: '📚' },
    { href: '/admin/sessions', label: 'Sessions', icon: '📋' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/courses', label: 'Batches', icon: '📚' },
    { href: '/admin/progress', label: 'Student progress', icon: '✅' },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside id="admin-navigation" className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <BrandLogo
              variant="light"
              className="sidebar-brand-logo"
              alt="The Ace Club by The Admit Co."
              preload
            />
          </div>
          <span className="badge badge-admin">Admin</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.href}
              className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={() => {
                if (!confirmLeave()) return;
                router.push(item.href);
                setSidebarOpen(false);
              }}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">AA</div>
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
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
