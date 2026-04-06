import type { Metadata } from 'next';
import StyledComponentsRegistry from './lib/styled-components-registry';

export const metadata: Metadata = {
  title: 'Phoenix Backoffice | Admin Panel',
  description: 'Admin and trading dashboard for Phoenix Sportsbook',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #0c0e1a; color: #e2e8f0; -webkit-font-smoothing: antialiased; }
          a { color: inherit; text-decoration: none; }
        `}} />
      </head>
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
