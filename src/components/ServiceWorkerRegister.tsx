"use client";

import React from 'react';

export default function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = React.useState<{ reg: ServiceWorkerRegistration } | null>(null);

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      const onLoad = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            // Update flow
            if (reg.waiting) {
              setUpdateReady({ reg });
            }
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateReady({ reg });
                }
              });
            });
          })
          .catch(() => {});
      };
      if (document.readyState === 'complete') onLoad();
      else window.addEventListener('load', onLoad, { once: true });
      return () => window.removeEventListener('load', onLoad as any);
    }
  }, []);

  // Proactively check for updates on visibilitychange
  React.useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const reloadWithUpdate = async () => {
    const reg = updateReady?.reg;
    if (!reg) return;
    reg.waiting?.postMessage('SKIP_WAITING');
    // When controller changes, the new SW has taken over
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true } as any);
  };
  return (
    <>
      {updateReady && (
        <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 50, pointerEvents: 'auto' }}>
          <div style={{ maxWidth: 480 }} className="mx-auto rounded-lg border border-neutral-800 bg-neutral-900/95 shadow-xl p-3 flex items-center justify-between">
            <div className="text-sm">Update available</div>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded bg-neutral-800" onClick={() => setUpdateReady(null)}>Later</button>
              <button className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500" onClick={reloadWithUpdate}>Reload</button>
            </div>
          </div>
        </div>
      )}
      {/* Manual SW refresh helper */}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 40, pointerEvents: 'auto' }}>
        <button
          className="hidden md:inline px-2 py-1 rounded bg-neutral-800 text-xs"
          onClick={() => navigator.serviceWorker.getRegistration().then((r) => r?.update())}
          title="Check for updates"
        >SW Update</button>
      </div>
    </>
  );
}
