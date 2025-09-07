export const metadata = {
  title: 'Web OS Browser',
  description: 'Lightweight web OS with multi-app iframe switching',
};

import './globals.css';
import React from 'react';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import ClipboardListener from '@/components/ClipboardListener';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Web OS" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <div className="h-screen flex flex-col">{children}</div>
        <ServiceWorkerRegister />
        <ClipboardListener />
      </body>
    </html>
  );
}
