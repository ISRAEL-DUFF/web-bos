"use client";

import React from 'react';
import IframeHost from '@/components/IframeHost';
import { useAppStore } from '@/store/appStore';
import clsx from 'clsx';

export default function HomePage() {
  const apps = useAppStore((s) => s.apps);
  const openIds = useAppStore((s) => s.openApps);
  const openApp = useAppStore((s) => s.openApp);
  const deleteApp = useAppStore((s) => s.deleteApp);
  const addApp = useAppStore((s) => s.addApp);
  const activeApp = useAppStore((s) => s.activeApp);
  const setActiveApp = useAppStore((s) => s.setActiveApp);
  const getZoom = useAppStore((s) => s.getZoom);
  const setZoom = useAppStore((s) => s.setZoom);

  const [name, setName] = React.useState('');
  const [url, setUrl] = React.useState('');

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      const u = new URL(url.trim());
      const id = addApp({ name: name.trim(), url: u.toString() });
      setName('');
      setUrl('');
      openApp(id);
    } catch {
      alert('Invalid URL');
    }
  };

  const showHome = activeApp == null;
  const zoom = activeApp ? getZoom(activeApp) : 1;

  const changeZoom = (delta: number) => {
    if (!activeApp) return;
    const next = Math.round((zoom + delta) * 10) / 10; // step 0.1
    setZoom(activeApp, next);
  };

  const [switcherOpen, setSwitcherOpen] = React.useState(false);

  return (
    <div className="relative flex-1">
      {/* Iframe layer lives behind UI */}
      <IframeHost />

      {/* Top bar removed; controls live in FAB menu */}

      {/* Home overlay */}
      {showHome && (
        <div className="absolute inset-0 z-10 p-4 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={onAdd} className="bg-neutral-900 rounded p-4 grid grid-cols-1 md:grid-cols-6 gap-2">
              <input
                className="md:col-span-2 px-3 py-2 rounded bg-neutral-800 outline-none"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="md:col-span-3 px-3 py-2 rounded bg-neutral-800 outline-none"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button className="md:col-span-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500">Add App</button>
            </form>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {apps.map((app) => (
                <div key={app.id} className="bg-neutral-900 rounded p-3 flex flex-col gap-2">
                  <div className="text-2xl">{app.icon ?? '🌐'}</div>
                  <div className="font-medium truncate" title={app.name}>{app.name}</div>
                  <div className="text-xs text-neutral-400 truncate" title={app.url}>{app.url}</div>
                  <div className="flex gap-2 mt-1">
                    <button className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-sm" onClick={() => openApp(app.id)}>Open</button>
                    <button className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" onClick={() => deleteApp(app.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAB (mobile and desktop) */}
      <div className="fixed bottom-4 right-4 z-20 pointer-events-auto">
        <button
          aria-label="Switch app"
          className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg flex items-center justify-center text-2xl"
          onClick={() => setSwitcherOpen((v) => !v)}
        >
          ⇄
        </button>
      </div>

      {/* Bottom sheet switcher (mobile) */}
      {switcherOpen && (
        <>
          <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setSwitcherOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-30 md:hidden pointer-events-auto">
            <div className="bg-neutral-900 border-t border-neutral-800 rounded-t-xl p-3 max-h-[60vh] overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Web OS</div>
                <div className="flex items-center gap-2">
                  {!showHome && (
                    <div className="flex items-center gap-1 text-sm">
                      <button className="px-2 py-1 rounded bg-neutral-800" onClick={() => changeZoom(-0.1)}>-</button>
                      <span className="min-w-[3.5rem] text-center">{Math.round(zoom * 100)}%</span>
                      <button className="px-2 py-1 rounded bg-neutral-800" onClick={() => changeZoom(+0.1)}>+</button>
                    </div>
                  )}
                  <button className="px-3 py-1 rounded bg-neutral-800" onClick={() => setActiveApp(null)}>Home</button>
                  <button className="px-3 py-1 rounded bg-neutral-800" onClick={() => setSwitcherOpen(false)}>Close</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {openIds.length === 0 && (
                  <div className="text-sm text-neutral-400">No open apps</div>
                )}
                {openIds.map((id) => {
                  const app = apps.find((a) => a.id === id);
                  if (!app) return null;
                  const isActive = activeApp === id;
                  return (
                    <button
                      key={id}
                      className={clsx(
                        'w-full flex items-center gap-2 p-3 rounded',
                        isActive ? 'bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800'
                      )}
                      onClick={() => { setActiveApp(id); setSwitcherOpen(false); }}
                    >
                      <span className="text-xl">{app.icon ?? '🌐'}</span>
                      <span className="flex-1 text-left truncate">{app.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop popover panel (chat-like) */}
      {switcherOpen && (
        <div className="hidden md:block fixed bottom-20 right-4 z-30 pointer-events-auto">
          <div className="w-80 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
              <div className="font-medium">Web OS</div>
              <div className="flex items-center gap-2">
                {!showHome && (
                  <div className="flex items-center gap-1 text-sm">
                    <button className="px-2 py-1 rounded bg-neutral-800" onClick={() => changeZoom(-0.1)}>-</button>
                    <span className="min-w-[3.5rem] text-center">{Math.round(zoom * 100)}%</span>
                    <button className="px-2 py-1 rounded bg-neutral-800" onClick={() => changeZoom(+0.1)}>+</button>
                  </div>
                )}
                <button className="px-2 py-1 rounded bg-neutral-800 text-sm" onClick={() => setActiveApp(null)}>Home</button>
                <button className="px-2 py-1 rounded bg-neutral-800 text-sm" onClick={() => setSwitcherOpen(false)}>Minimize</button>
              </div>
            </div>
            <div className="max-h-80 overflow-auto p-2">
              {openIds.length === 0 && (
                <div className="text-sm text-neutral-400 px-2 py-3">No open apps</div>
              )}
              <div className="grid grid-cols-1 gap-1">
                {openIds.map((id) => {
                  const app = apps.find((a) => a.id === id);
                  if (!app) return null;
                  const isActive = activeApp === id;
                  return (
                    <button
                      key={id}
                      className={clsx(
                        'w-full flex items-center gap-2 p-2 rounded',
                        isActive ? 'bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800'
                      )}
                      onClick={() => { setActiveApp(id); setSwitcherOpen(false); }}
                      title={app.name}
                    >
                      <span className="text-xl">{app.icon ?? '🌐'}</span>
                      <span className="flex-1 text-left truncate">{app.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
