'use client';

import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/trading', label: 'Trading', icon: 'trending-up' },
  { href: '/risk-management', label: 'Risk Management', icon: 'shield-alert' },
  { href: '/users', label: 'Users', icon: 'users' },
  { href: '/loyalty', label: 'Loyalty', icon: 'trophy' },
  { href: '/leaderboards', label: 'Leaderboards', icon: 'medal' },
  { href: '/audit-logs', label: 'Audit Logs', icon: 'scroll-text' },
  { href: '/reports', label: 'Reports', icon: 'file-text' },
];

/* Lucide icon SVG paths — inlined to avoid a runtime dependency in the office package */
const lucideIcons: Record<string, string> = {
  'layout-dashboard': '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'shield-alert': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  'medal': '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
  'scroll-text': '<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
};

function LucideIcon({ name, size = 18, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const paths = lucideIcons[name] || '';
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .dash-shell { display: flex; min-height: 100vh; }
        .dash-sidebar {
          width: 240px; background: #0f1225; border-right: 1px solid #1a1f3a;
          display: flex; flex-direction: column; position: fixed; top: 0; bottom: 0; left: 0;
          z-index: 10;
        }
        .dash-brand {
          padding: 24px 20px 20px; display: flex; align-items: center; gap: 12px;
          border-bottom: 1px solid #1a1f3a;
        }
        .dash-brand-logo {
          width: 36px; height: 36px; border-radius: 8px; object-fit: contain;
        }
        .dash-brand-text { font-size: 14px; font-weight: 600; color: #D3D3D3; }
        .dash-nav-section {
          font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;
          letter-spacing: 0.04em; padding: 16px 16px 6px;
        }
        .dash-nav { flex: 1; padding: 8px 12px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
        .dash-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 14px; border-radius: 8px;
          font-size: 13px; font-weight: 500; color: #D3D3D3;
          transition: all 0.15s; cursor: pointer; border: none; background: none;
          text-decoration: none; border-left: 3px solid transparent;
        }
        .dash-nav-item:hover { color: #e2e8f0; background: #161a35; }
        .dash-nav-item.active {
          color: #4ade80; background: #1a2040; font-weight: 600;
          border-left-color: #4ade80;
        }
        .dash-nav-item.active svg { stroke: #4ade80; }
        .dash-nav-icon { width: 18px; height: 18px; flex-shrink: 0; }
        .dash-content { flex: 1; margin-left: 240px; display: flex; flex-direction: column; min-height: 100vh; }
        .dash-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 18px 28px; background: #0f1225; border-bottom: 1px solid #1a1f3a;
          position: sticky; top: 0; z-index: 5;
        }
        .dash-header-title { font-size: 15px; font-weight: 600; color: #D3D3D3; }
        .dash-user-badge {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 14px 6px 8px; border-radius: 8px; background: #161a35;
          border: 1px solid #1a1f3a;
        }
        .dash-avatar {
          width: 30px; height: 30px; border-radius: 8px;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #101114;
        }
        .dash-page { flex: 1; padding: 28px; }
        .dash-signout { color: #ef4444 !important; font-size: 13px !important; }
        .dash-signout:hover { background: rgba(239,68,68,0.08) !important; }
        @media (max-width: 768px) {
          .dash-shell { flex-direction: column; }
          .dash-sidebar {
            display: flex;
            position: relative;
            width: 100%;
            top: auto; bottom: auto; left: auto;
            border-right: none;
            border-bottom: 1px solid #1a1f3a;
          }
          .dash-brand {
            padding: 14px 16px;
            border-bottom: none;
            border-right: 1px solid #1a1f3a;
            min-width: max-content;
          }
          .dash-nav {
            flex-direction: row;
            gap: 4px;
            padding: 12px;
            overflow-x: auto;
            flex: 1;
          }
          .dash-nav-item {
            min-width: max-content;
            padding: 10px 12px;
            border-left: none;
          }
          .dash-nav-item.active { border-left: none; border-bottom: 2px solid #4ade80; }
          .dash-nav-section { display: none; }
          .dash-sidebar > div:last-child {
            padding: 12px;
            border-top: none !important;
            border-left: 1px solid #1a1f3a;
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
            <img src="/logo-tn.png" alt="TAYA NA!" className="dash-brand-logo" />
            <span className="dash-brand-text">Backoffice</span>
          </div>
          <nav className="dash-nav">
            <div className="dash-nav-section">Operations</div>
            {navItems.slice(0, 4).map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`dash-nav-item ${pathname?.startsWith(item.href) ? 'active' : ''}`}
              >
                <span className="dash-nav-icon">
                  <LucideIcon name={item.icon} />
                </span>
                {item.label}
              </a>
            ))}
            <div className="dash-nav-section">Engagement</div>
            {navItems.slice(4, 6).map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`dash-nav-item ${pathname?.startsWith(item.href) ? 'active' : ''}`}
              >
                <span className="dash-nav-icon">
                  <LucideIcon name={item.icon} />
                </span>
                {item.label}
              </a>
            ))}
            <div className="dash-nav-section">System</div>
            {navItems.slice(6).map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`dash-nav-item ${pathname?.startsWith(item.href) ? 'active' : ''}`}
              >
                <span className="dash-nav-icon">
                  <LucideIcon name={item.icon} />
                </span>
                {item.label}
              </a>
            ))}
          </nav>
          <div style={{ padding: '16px 12px', borderTop: '1px solid #1a1f3a' }}>
            <a href="/auth/login" className="dash-nav-item dash-signout">
              <span className="dash-nav-icon">
                <LucideIcon name="log-out" />
              </span>
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
