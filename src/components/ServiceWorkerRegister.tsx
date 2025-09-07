"use client";

import React from 'react';

export default function ServiceWorkerRegister() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      const onLoad = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .catch(() => {});
      };
      if (document.readyState === 'complete') onLoad();
      else window.addEventListener('load', onLoad, { once: true });
      return () => window.removeEventListener('load', onLoad as any);
    }
  }, []);
  return null;
}

