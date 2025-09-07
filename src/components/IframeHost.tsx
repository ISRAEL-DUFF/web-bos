"use client";

import React from 'react';
import { useAppStore } from '@/store/appStore';

const SANDBOX = 'allow-scripts allow-forms allow-same-origin';
// Permissions-Policy features enabled inside apps
const ALLOW = 'geolocation; microphone; camera; clipboard-write; clipboard-read';

export default function IframeHost() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const frames = React.useRef<Map<string, HTMLIFrameElement>>(new Map());

  const openIds = useAppStore((s) => s.openApps);
  const activeId = useAppStore((s) => s.activeApp);
  const appsById = useAppStore((s) => s.appsById());
  const getZoom = useAppStore((s) => s.getZoom);

  const [loading, setLoading] = React.useState<Set<string>>(() => new Set());

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
        const onLoad = () => setLoading((prev) => { const n = new Set(prev); n.delete(id); return n; });
        iframe.addEventListener('load', onLoad, { once: true });
      }
    }

    // remove closed
    for (const [id, iframe] of Array.from(frames.current.entries())) {
      if (!openIds.includes(id)) {
        iframe.remove();
        frames.current.delete(id);
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
        iframe.src = app.url; // explicit reload on edit
        const onLoad = () => setLoading((prev) => { const n = new Set(prev); n.delete(id); return n; });
        iframe.addEventListener('load', onLoad, { once: true });
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

  return (
    <div className="iframe-host">
      <div ref={containerRef} className="absolute inset-0" />
      {isActiveLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="h-10 w-10 rounded-full border-2 border-neutral-700 border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}
