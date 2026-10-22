import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Event Splitter – share the fun, split the bill', template: '%s · Event Splitter' },
  description: 'A festive way for friend groups to log shared spending, split it fairly and settle up.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#d9381e' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Fraunces:opsz,wght@9..144,600;9..144,800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
