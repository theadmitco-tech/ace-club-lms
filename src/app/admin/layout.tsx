'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import './admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/sessions', label: 'Sessions', icon: '📋' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/courses', label: 'Batches', icon: '📚' },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L30 9V23L16 30L2 23V9L16 2Z" fill="url(#sb-grad)" fillOpacity="0.3" stroke="url(#sb-grad)" strokeWidth="1.5"/>
              <path d="M16 8L24 12.5V21.5L16 26L8 21.5V12.5L16 8Z" fill="url(#sb-grad)" fillOpacity="0.5"/>
              <text x="16" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A</text>
              <defs>
                <linearGradient id="sb-grad" x1="2" y1="2" x2="30" y2="30">
                  <stop offset="0%" stopColor="#4F7CFF"/>
                  <stop offset="100%" stopColor="#7C3AED"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="sidebar-brand-text">Ace Club</span>
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
