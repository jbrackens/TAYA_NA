/**
 * Auth layout — full-page, no sidebar or header.
 * Overrides the dashboard chrome for login/register flows.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      {children}
    </div>
  );
}
