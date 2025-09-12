"use client";

import React from 'react';
import { useAppStore } from '@/store/appStore';

const SANDBOX = 'allow-scripts allow-forms allow-same-origin';
// Permissions-Policy features enabled inside apps
const ALLOW = 'geolocation; microphone; camera; clipboard-write; clipboard-read';

export default function IframeHost() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const frames = React.useRef<Map<string, HTMLIFrameElement>>(new Map());
  const timers = React.useRef<Map<string, number>>(new Map());

  const openIds = useAppStore((s) => s.openApps);
  const activeId = useAppStore((s) => s.activeApp);
  const appsById = useAppStore((s) => s.appsById());
  const getZoom = useAppStore((s) => s.getZoom);

  const [loading, setLoading] = React.useState<Set<string>>(() => new Set());
  const [blocked, setBlocked] = React.useState<Set<string>>(() => new Set());
  const [progress, setProgress] = React.useState(0);
  const progTimer = React.useRef<number | null>(null);

  // Create and remove iframes only when openIds change
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // create missing
    for (const id of openIds) {
      if (!frames.current.has(id)) {
        const app = appsById[id];
        if (!app) continue;
        const iframe = document.createElement('iframe');
        iframe.src = app.url;
        iframe.sandbox.add('allow-scripts', 'allow-forms', 'allow-same-origin');
        iframe.allow = ALLOW;
        iframe.style.position = 'absolute';
        iframe.style.inset = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        iframe.style.pointerEvents = 'none';
        iframe.style.transformOrigin = '0 0';
        // apply initial zoom
        const z = getZoom(id);
        iframe.style.transform = `scale(${z})`;
        iframe.style.width = z !== 1 ? `${(100 / z).toFixed(6)}%` : '100%';
        iframe.style.height = z !== 1 ? `${(100 / z).toFixed(6)}%` : '100%';
        container.appendChild(iframe);
        frames.current.set(id, iframe);

        // mark loading until first load event
        setLoading((prev) => new Set(prev).add(id));
        const onLoad = () => {
          // clear timer if any
          const t = timers.current.get(id);
          if (t) { clearTimeout(t); timers.current.delete(id); }
          setLoading((prev) => { const n = new Set(prev); n.delete(id); return n; });
          setBlocked((prev) => { const n = new Set(prev); n.delete(id); return n; });
        };
        iframe.addEventListener('load', onLoad, { once: true });

        // start blocked timeout (site may disallow embedding)
        const timeoutId = window.setTimeout(() => {
          setBlocked((prev) => {
            // only mark blocked if still loading
            if (!loading.has(id)) return prev;
            const n = new Set(prev);
            n.add(id);
            return n;
          });
        }, 6000);
        timers.current.set(id, timeoutId);
      }
    }

    // remove closed
    for (const [id, iframe] of Array.from(frames.current.entries())) {
      if (!openIds.includes(id)) {
        iframe.remove();
        frames.current.delete(id);
        const t = timers.current.get(id);
        if (t) { clearTimeout(t); timers.current.delete(id); }
        setLoading((prev) => { const n = new Set(prev); n.delete(id); return n; });
        setBlocked((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }
    }
  }, [openIds, appsById]);

  // Toggle visibility without touching src
  React.useEffect(() => {
    for (const [id, iframe] of frames.current.entries()) {
      const active = id === activeId;
      iframe.style.visibility = active ? 'visible' : 'hidden';
      iframe.style.pointerEvents = active ? 'auto' : 'none';
    }
  }, [activeId]);

  // If an app's URL is edited, update the existing iframe src explicitly
  React.useEffect(() => {
    for (const [id, iframe] of frames.current.entries()) {
      const app = appsById[id];
      if (app && iframe.src !== app.url) {
        // mark as loading again
        setLoading((prev) => new Set(prev).add(id));
        setBlocked((prev) => { const n = new Set(prev); n.delete(id); return n; });
        // clear previous timer and start a new one
        const prevTimer = timers.current.get(id);
        if (prevTimer) { clearTimeout(prevTimer); timers.current.delete(id); }
        iframe.src = app.url; // explicit reload on edit
        const onLoad = () => {
          const t = timers.current.get(id);
          if (t) { clearTimeout(t); timers.current.delete(id); }
          setLoading((prev) => { const n = new Set(prev); n.delete(id); return n; });
          setBlocked((prev) => { const n = new Set(prev); n.delete(id); return n; });
        };
        iframe.addEventListener('load', onLoad, { once: true });
        const timeoutId = window.setTimeout(() => {
          setBlocked((prev) => {
            if (!loading.has(id)) return prev;
            const n = new Set(prev);
            n.add(id);
            return n;
          });
        }, 6000);
        timers.current.set(id, timeoutId);
      }
    }
  }, [appsById]);

  // Apply zoom changes on demand
  React.useEffect(() => {
    for (const [id, iframe] of frames.current.entries()) {
      const z = getZoom(id);
      iframe.style.transform = `scale(${z})`;
      iframe.style.width = z !== 1 ? `${(100 / z).toFixed(6)}%` : '100%';
      iframe.style.height = z !== 1 ? `${(100 / z).toFixed(6)}%` : '100%';
    }
  });

  const isActiveLoading = activeId ? loading.has(activeId) : false;
  const isActiveBlocked = activeId ? blocked.has(activeId) : false;

  // Simulated top loading bar progress for active app (cross-origin safe)
  React.useEffect(() => {
    if (!activeId) {
      if (progTimer.current) { window.clearInterval(progTimer.current); progTimer.current = null; }
      setProgress(0);
      return;
    }
    if (isActiveLoading && !isActiveBlocked) {
      // start/increase toward 80%
      if (progTimer.current) window.clearInterval(progTimer.current);
      setProgress((p) => (p < 10 ? 10 : p));
      progTimer.current = window.setInterval(() => {
        setProgress((p) => {
          const target = 85;
          if (p < target) return p + Math.max(1, Math.round((target - p) * 0.05));
          return p;
        });
      }, 150);
    } else if (!isActiveLoading) {
      // finish to 100 then reset
      if (progTimer.current) { window.clearInterval(progTimer.current); progTimer.current = null; }
      setProgress((p) => (p > 0 ? 100 : 0));
      const t = window.setTimeout(() => setProgress(0), 250);
      return () => window.clearTimeout(t);
    }
    return () => {
      if (progTimer.current) { window.clearInterval(progTimer.current); progTimer.current = null; }
    };
  }, [activeId, isActiveLoading, isActiveBlocked]);

  const reloadById = (id: string | null | undefined) => {
    if (!id) return;
    const iframe = frames.current.get(id);
    const app = appsById[id];
    if (!iframe || !app) return;
    setBlocked((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setLoading((prev) => new Set(prev).add(id));
    const prevTimer = timers.current.get(id);
    if (prevTimer) { clearTimeout(prevTimer); timers.current.delete(id); }
    iframe.src = app.url;
    const onLoad = () => {
      const t = timers.current.get(id);
      if (t) { clearTimeout(t); timers.current.delete(id); }
      setLoading((prev) => { const n = new Set(prev); n.delete(id); return n; });
      setBlocked((prev) => { const n = new Set(prev); n.delete(id); return n; });
    };
    iframe.addEventListener('load', onLoad, { once: true });
    const timeoutId = window.setTimeout(() => {
      setBlocked((prev) => {
        if (!loading.has(id)) return prev;
        const n = new Set(prev);
        n.add(id);
        return n;
      });
    }, 6000);
    timers.current.set(id, timeoutId);
  };

  const retryActive = () => reloadById(activeId);

  const openActiveInNewTab = () => {
    if (!activeId) return;
    const app = appsById[activeId];
    if (!app) return;
    window.open(app.url, '_blank', 'noopener,noreferrer');
  };

  const keepWaiting = () => {
    if (!activeId) return;
    setBlocked((prev) => { const n = new Set(prev); n.delete(activeId); return n; });
  };

  // Listen for external reload requests (e.g., from UI menu)
  React.useEffect(() => {
    const onReload = (e: Event) => {
      try {
        const detail = (e as CustomEvent<{ id?: string }>).detail || {};
        const id = detail.id ?? activeId;
        reloadById(id);
      } catch {
        // ignore
      }
    };
    window.addEventListener('webos:reload' as any, onReload as any);
    return () => window.removeEventListener('webos:reload' as any, onReload as any);
  }, [activeId, appsById]);

  return (
    <div className="iframe-host">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Top loading bar */}
      {progress > 0 && (
        <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-neutral-800">
          <div
            className="h-full bg-blue-500 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {isActiveBlocked && (
        <div className="absolute inset-0 z-20 flex items-end md:items-center justify-center">
          <div className="m-4 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900/95 p-4 shadow-xl">
            <div className="font-medium mb-1">This site may not allow embedding</div>
            <div className="text-sm text-neutral-400 mb-3">It’s taking longer than usual to load. Some sites block iframes via X-Frame-Options or CSP.</div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button className="px-3 py-1 rounded bg-neutral-800" onClick={keepWaiting}>Keep waiting</button>
              <button className="px-3 py-1 rounded bg-neutral-800" onClick={retryActive}>Retry</button>
              <button className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500" onClick={openActiveInNewTab}>Open in new tab</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
