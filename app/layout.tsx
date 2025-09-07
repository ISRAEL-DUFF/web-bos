export const metadata = {
  title: 'Web OS Browser',
  description: 'Lightweight web OS with multi-app iframe switching',
};

import './globals.css';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
