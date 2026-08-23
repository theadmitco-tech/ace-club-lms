'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/lib/AuthContext';
import './admin.css';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    { href: '/admin/question-bank', label: 'Question Bank', icon: '🧠' },
    { href: '/admin/mock-builder', label: 'Mock Builder', icon: '📝' },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
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
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <button
        className="admin-sidebar-toggle"
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
