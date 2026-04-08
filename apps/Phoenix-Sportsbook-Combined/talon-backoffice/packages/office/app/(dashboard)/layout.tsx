'use client';

import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/trading', label: 'Trading', icon: '📈' },
  { href: '/risk-management', label: 'Risk Management', icon: '🛡️' },
  { href: '/users', label: 'Users', icon: '👥' },
  { href: '/loyalty', label: 'Loyalty', icon: '🏆' },
  { href: '/audit-logs', label: 'Audit Logs', icon: '📋' },
  { href: '/reports', label: 'Reports', icon: '📄' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .dash-shell { display: flex; min-height: 100vh; }
        .dash-sidebar {
          width: 260px; background: #111328; border-right: 1px solid #1e2243;
          display: flex; flex-direction: column; position: fixed; top: 0; bottom: 0; left: 0;
          z-index: 10;
        }
        .dash-brand {
          padding: 24px 20px 20px; display: flex; align-items: center; gap: 12px;
          border-bottom: 1px solid #1e2243;
        }
        .dash-brand-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          display: flex; align-items: center; justify-content: center; font-size: 16px;
          box-shadow: 0 4px 12px rgba(99,102,241,0.2);
        }
        .dash-brand-text { font-size: 16px; font-weight: 700; color: #f1f5f9; }
        .dash-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
        .dash-nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 14px; border-radius: 10px;
          font-size: 14px; font-weight: 500; color: #64748b;
          transition: all 0.15s; cursor: pointer; border: none; background: none;
          text-decoration: none;
        }
        .dash-nav-item:hover { color: #cbd5e1; background: #1a1f3a; }
        .dash-nav-item.active { color: #e2e8f0; background: #1e2347; box-shadow: inset 3px 0 0 #6366f1; }
        .dash-nav-icon { font-size: 17px; width: 24px; text-align: center; }
        .dash-content { flex: 1; margin-left: 260px; display: flex; flex-direction: column; min-height: 100vh; }
        .dash-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 18px 28px; background: #111328; border-bottom: 1px solid #1e2243;
          position: sticky; top: 0; z-index: 5;
        }
        .dash-header-title { font-size: 15px; font-weight: 600; color: #94a3b8; }
        .dash-user-badge {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 14px 6px 8px; border-radius: 8px; background: #1a1f3a;
        }
        .dash-avatar {
          width: 30px; height: 30px; border-radius: 8px;
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff;
        }
        .dash-page { flex: 1; padding: 28px; }
        @media (max-width: 768px) {
          .dash-shell { flex-direction: column; }
          .dash-sidebar {
            display: flex;
            position: relative;
            width: 100%;
            top: auto;
            bottom: auto;
            left: auto;
            border-right: none;
            border-bottom: 1px solid #1e2243;
          }
          .dash-brand {
            padding: 14px 16px;
            border-bottom: none;
            border-right: 1px solid #1e2243;
            min-width: max-content;
          }
          .dash-nav {
            flex-direction: row;
            gap: 8px;
            padding: 12px;
            overflow-x: auto;
            flex: 1;
          }
          .dash-nav-item {
            min-width: max-content;
            padding: 10px 12px;
          }
          .dash-sidebar > div:last-child {
            padding: 12px;
            border-top: none !important;
            border-left: 1px solid #1e2243;
          }
          .dash-content { margin-left: 0; }
          .dash-header {
            padding: 14px 16px;
            flex-wrap: wrap;
            gap: 10px;
          }
          .dash-page { padding: 16px; }
        }
      `}} />

      <div className="dash-shell">
        <aside className="dash-sidebar">
          <div className="dash-brand">
            <div className="dash-brand-icon">⚡</div>
            <span className="dash-brand-text">Phoenix</span>
          </div>
          <nav className="dash-nav">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`dash-nav-item ${pathname?.startsWith(item.href) ? 'active' : ''}`}
              >
                <span className="dash-nav-icon">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div style={{ padding: '16px 12px', borderTop: '1px solid #1e2243' }}>
            <a href="/auth/login" className="dash-nav-item" style={{ color: '#ef4444', fontSize: 13 }}>
              <span className="dash-nav-icon">🚪</span>
              Sign Out
            </a>
          </div>
        </aside>

        <div className="dash-content">
          <header className="dash-header">
            <span className="dash-header-title">
              {navItems.find(i => pathname?.startsWith(i.href))?.label || 'Dashboard'}
            </span>
            <div className="dash-user-badge">
              <div className="dash-avatar">A</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Admin</span>
            </div>
          </header>
          <div className="dash-page">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
