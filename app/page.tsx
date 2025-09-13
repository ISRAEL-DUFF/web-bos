"use client";

import React from 'react';
import IframeHost from '@/components/IframeHost';
import { useAppStore } from '@/store/appStore';
import clsx from 'clsx';
import Favicon from '@/components/Favicon';
import type { BeforeInstallPromptEvent } from '@/types';

export default function HomePage() {
  const apps = useAppStore((s) => s.apps);
  const openIds = useAppStore((s) => s.openApps);
  const openApp = useAppStore((s) => s.openApp);
  const deleteApp = useAppStore((s) => s.deleteApp);
  const closeApp = useAppStore((s) => s.closeApp);
  const addApp = useAppStore((s) => s.addApp);
  const activeApp = useAppStore((s) => s.activeApp);
  const setActiveApp = useAppStore((s) => s.setActiveApp);
  const appsById = useAppStore((s) => s.appsById());
  const getZoom = useAppStore((s) => s.getZoom);
  const setZoom = useAppStore((s) => s.setZoom);
  const clipboard = useAppStore((s) => s.clipboard);
  const addClipboard = useAppStore((s) => s.addClipboard);
  const removeClipboard = useAppStore((s) => s.removeClipboard);
  const clearClipboard = useAppStore((s) => s.clearClipboard);
  const notepad = useAppStore((s) => s.notepad);
  const setNotepad = useAppStore((s) => s.setNotepad);

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
  const [installEvt, setInstallEvt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [dragY, setDragY] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startYRef = React.useRef<number | null>(null);
  // Movable FAB state
  const [fabPos, setFabPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const fabDownRef = React.useRef<{ id: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const skipNextClickRef = React.useRef(false);
  const dragWasMoveRef = React.useRef(false);
  const [isTouchEnv, setIsTouchEnv] = React.useState(false);
  const [panel, setPanel] = React.useState<'apps' | 'clipboard' | 'notes'>('apps');

  // Persist FAB open state between visits
  React.useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('ui.switcherOpen') : null;
    if (saved) setSwitcherOpen(saved === '1');
  }, []);
  React.useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('ui.switcherOpen', switcherOpen ? '1' : '0');
  }, [switcherOpen]);

  // ESC to close
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSwitcherOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Initialize and persist FAB position
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchEnv('ontouchstart' in window || (navigator as any).maxTouchPoints > 0);
    }
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('ui.fabPos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setFabPos(parsed);
          return;
        }
      } catch {}
    }
    const margin = 16;
    const size = 48; // h-12 w-12
    setFabPos({ x: window.innerWidth - margin - size, y: window.innerHeight - margin - size });
  }, []);
  React.useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('ui.fabPos', JSON.stringify(fabPos));
  }, [fabPos]);
  React.useEffect(() => {
    const onResize = () => {
      const margin = 8;
      const size = 48;
      setFabPos((p) => ({
        x: Math.max(margin, Math.min(p.x, window.innerWidth - margin - size)),
        y: Math.max(margin, Math.min(p.y, window.innerHeight - margin - size)),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onFabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const id = e.pointerId ?? 0;
    e.currentTarget.setPointerCapture?.(id);
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    fabDownRef.current = { id, startX: e.clientX, startY: e.clientY, offsetX, offsetY, moved: false };
    skipNextClickRef.current = false;
  };
  const onFabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const st = fabDownRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    const threshold = 20;
    if (!st.moved && Math.hypot(dx, dy) > threshold) {
      st.moved = true;
      // mark that a drag occurred; we'll suppress the subsequent click
      skipNextClickRef.current = true;
    }
    if (st.moved) {
      const margin = 8;
      const size = 48;
      const nx = e.clientX - st.offsetX;
      const ny = e.clientY - st.offsetY;
      const maxX = window.innerWidth - margin - size;
      const maxY = window.innerHeight - margin - size;
      setFabPos({ x: Math.max(margin, Math.min(nx, maxX)), y: Math.max(margin, Math.min(ny, maxY)) });
    }
  };
  const onFabPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const st = fabDownRef.current;
    fabDownRef.current = null;
    if (!st) return;
    e.currentTarget.releasePointerCapture?.(st.id);
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    const threshold = 20;
    const isClick = Math.hypot(dx, dy) <= threshold;
    if (isClick) {
      // Toggle now; let click be ignored just in case
      setSwitcherOpen((v) => !v);
      skipNextClickRef.current = true;
      dragWasMoveRef.current = false;
    } else {
      dragWasMoveRef.current = true;
    }
  };
  const onFabPointerCancel = () => {
    fabDownRef.current = null;
    skipNextClickRef.current = false;
    dragWasMoveRef.current = false;
  };
  const onFabClick = () => {
    if (skipNextClickRef.current || dragWasMoveRef.current) {
      // Reset and ignore this click (it followed a pointerup toggle or a drag)
      skipNextClickRef.current = false;
      dragWasMoveRef.current = false;
      return;
    }
    setSwitcherOpen((v) => !v);
  };

  // Touch event fallback (iOS Safari reliability)
  const onFabTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    const t = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = t.clientX - rect.left;
    const offsetY = t.clientY - rect.top;
    fabDownRef.current = { id: 0, startX: t.clientX, startY: t.clientY, offsetX, offsetY, moved: false };
    skipNextClickRef.current = false;
    dragWasMoveRef.current = false;
  };
  const onFabTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    const st = fabDownRef.current;
    if (!st) return;
    const t = e.touches[0];
    const dx = t.clientX - st.startX;
    const dy = t.clientY - st.startY;
    const threshold = 20;
    if (!st.moved && Math.hypot(dx, dy) > threshold) {
      st.moved = true;
      skipNextClickRef.current = true;
    }
    if (st.moved) {
      e.preventDefault(); // prevent scroll during drag
      const margin = 8;
      const size = 48;
      const nx = t.clientX - st.offsetX;
      const ny = t.clientY - st.offsetY;
      const maxX = window.innerWidth - margin - size;
      const maxY = window.innerHeight - margin - size;
      setFabPos({ x: Math.max(margin, Math.min(nx, maxX)), y: Math.max(margin, Math.min(ny, maxY)) });
    }
  };
  const onFabTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    const st = fabDownRef.current;
    fabDownRef.current = null;
    if (!st) return;
    const threshold = 20;
    const isClick = !st.moved;
    if (isClick) {
      setSwitcherOpen((v) => !v);
      skipNextClickRef.current = true;
      dragWasMoveRef.current = false;
    } else {
      dragWasMoveRef.current = true;
    }
  };
  const onFabTouchCancel = () => {
    fabDownRef.current = null;
    skipNextClickRef.current = false;
    dragWasMoveRef.current = false;
  };

  // Capture install prompt
  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onInstall = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    const choice = await installEvt.userChoice.catch(() => null);
    setInstallEvt(null);
    return choice;
  };

  // Bottom sheet drag handlers (mobile)
  const onDragStart = (clientY: number) => {
    startYRef.current = clientY;
    setDragging(true);
  };
  const onDragMove = (clientY: number) => {
    if (startYRef.current == null) return;
    const dy = Math.max(0, clientY - startYRef.current);
    setDragY(dy);
  };
  const onDragEnd = () => {
    const threshold = 100; // px to close
    if (dragY > threshold) {
      setSwitcherOpen(false);
    }
    setDragY(0);
    setDragging(false);
    startYRef.current = null;
  };

  const syncFromSystemClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) addClipboard(text);
    } catch {
      alert('Clipboard read blocked. Try using the copy action inside the app or paste into Notepad.');
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const refreshPage = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  const copyActiveUrl = async () => {
    if (!activeApp) return;
    const app = appsById[activeApp];
    if (!app) return;
    try { await navigator.clipboard.writeText(app.url); } catch {}
  };

  const reloadAppById = (id?: string) => {
    const ev = new CustomEvent('webos:reload', { detail: { id } });
    window.dispatchEvent(ev);
  };

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
                  <div className="text-2xl">
                    {app.icon ? app.icon : <Favicon url={app.url} size={28} className="rounded" />}
                  </div>
                  <div className="font-medium truncate" title={app.name}>{app.name}</div>
                  <div className="text-xs text-neutral-400 truncate" title={app.url}>{app.url}</div>
                  <div className="flex gap-2 mt-1 items-center">
                    <button
                      aria-label="Open"
                      title="Open"
                      className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-sm flex items-center gap-1"
                      onClick={() => openApp(app.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/>
                        <path d="M5 5h5V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5h-2v5H5V5z"/>
                      </svg>
                      <span className="hidden md:inline">Open</span>
                    </button>
                    <button
                      aria-label="Copy URL"
                      title="Copy URL"
                      className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                      onClick={() => copyText(app.url)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M16 1H6a2 2 0 0 0-2 2v10h2V3h10V1z"/>
                        <path d="M18 5H10a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 14H10V7h8v12z"/>
                      </svg>
                    </button>
                    <button
                      aria-label="Delete app"
                      title="Delete app"
                      className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                      onClick={() => { if (confirm(`Delete \"${app.name}\"?`)) deleteApp(app.id); }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm1 2V4h4v1h-4z"/>
                        <path d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8zm4 2v9h2v-9h-2zm4 0v9h2v-9h-2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAB (mobile and desktop) */}
      <div
        className="fixed z-50 pointer-events-auto"
        style={{ left: `${fabPos.x}px`, top: `${fabPos.y}px` }}
      >
        <button
          aria-label="Switch app"
          className={clsx(
            'h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg flex items-center justify-center text-2xl transition-transform duration-200',
            switcherOpen && 'rotate-45'
          )}
          {...(!isTouchEnv ? {
            onPointerDown: onFabPointerDown,
            onPointerMove: onFabPointerMove,
            onPointerUp: onFabPointerUp,
            onPointerCancel: onFabPointerCancel,
          } : {})}
          onClick={onFabClick}
          onTouchStart={onFabTouchStart}
          onTouchMove={onFabTouchMove}
          onTouchEnd={onFabTouchEnd}
          onTouchCancel={onFabTouchCancel}
        >
          ⇄
        </button>
      </div>

      {/* Bottom sheet switcher (mobile) with transitions */}
      <div>
        <div
          aria-hidden={!switcherOpen}
          className={clsx(
            'fixed inset-0 z-20 bg-black/40 md:hidden transition-opacity duration-200',
            switcherOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
          onClick={() => setSwitcherOpen(false)}
        />
        <div className={clsx('fixed inset-x-0 bottom-0 z-30 md:hidden pointer-events-none')}>
          <div
            className={clsx(
              'pointer-events-auto transform',
              dragging ? 'transition-none' : 'transition-transform duration-250 ease-out'
            )}
            style={{ transform: switcherOpen ? `translateY(${dragY}px)` : 'translateY(100%)' }}
          >
            <div className="bg-neutral-900 border-t border-neutral-800 rounded-t-xl pt-2 max-h-[60vh] overflow-hidden">
              {/* Drag handle */}
              <div
                className="mx-auto mb-1 h-1.5 w-14 rounded-full bg-neutral-700"
                onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
                onTouchMove={(e) => { e.preventDefault(); onDragMove(e.touches[0].clientY); }}
                onTouchEnd={onDragEnd}
              />
              <div className="px-3 pb-[max(env(safe-area-inset-bottom),1rem)] overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Web OS</div>
              <div className="flex items-center gap-2">
                {installEvt && (
                  <button className="px-3 py-1 rounded bg-green-600 hover:bg-green-500" onClick={onInstall}>Install</button>
                )}
                {!showHome && (
                  <div className="flex items-center gap-1 text-sm">
                    <button className="px-2 py-1 rounded bg-neutral-800" onClick={() => changeZoom(-0.1)}>-</button>
                    <span className="min-w-[3.5rem] text-center">{Math.round(zoom * 100)}%</span>
                    <button className="px-2 py-1 rounded bg-neutral-800" onClick={() => changeZoom(+0.1)}>+</button>
                  </div>
                )}
                <button
                  aria-label="Refresh page"
                  title="Refresh"
                  className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                  onClick={refreshPage}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M12 4a8 8 0 1 1-7.45 11H6a6 6 0 1 0 1.76-4.24L10 12H4V6l2.12 2.12A7.98 7.98 0 0 1 12 4z"/>
                  </svg>
                </button>
                {!showHome && (
                  <>
                    <button className="px-3 py-1 rounded bg-neutral-800" onClick={() => reloadAppById(activeApp!)}>Reload</button>
                    <button
                      aria-label="Copy URL"
                      title="Copy URL"
                      className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                      onClick={copyActiveUrl}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M16 1H6a2 2 0 0 0-2 2v10h2V3h10V1z"/>
                        <path d="M18 5H10a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 14H10V7h8v12z"/>
                      </svg>
                    </button>
                  </>
                )}
                <button className="px-3 py-1 rounded bg-neutral-800" onClick={() => setActiveApp(null)}>Home</button>
                <button className="px-3 py-1 rounded bg-neutral-800" onClick={() => setSwitcherOpen(false)}>Close</button>
              </div>
          </div>
              {/* Panel tabs */}
              <div className="flex items-center gap-2 mb-2">
                {(['apps','clipboard','notes'] as const).map((key) => (
                  <button key={key}
                    className={clsx('px-3 py-1 rounded text-sm', panel === key ? 'bg-neutral-800' : 'bg-neutral-900')}
                    onClick={() => setPanel(key)}
                  >{key === 'apps' ? 'Apps' : key === 'clipboard' ? 'Clipboard' : 'Notepad'}</button>
                ))}
              </div>
              {/* Apps panel */}
              {panel === 'apps' && (
                <div className="grid grid-cols-1 gap-2">
                  {openIds.length === 0 && (
                    <div className="text-sm text-neutral-400">No open apps</div>
                  )}
                  {openIds.map((id) => {
                    const app = apps.find((a) => a.id === id);
                    if (!app) return null;
                    const isActive = activeApp === id;
                    return (
                      <div
                        key={id}
                        className={clsx(
                          'w-full flex items-center gap-2 p-3 rounded transition-transform active:scale-[0.98]',
                          isActive ? 'bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800'
                        )}
                      >
                        <button className="flex-1 flex items-center gap-2 text-left"
                          onClick={() => { setActiveApp(id); setSwitcherOpen(false); }}
                          title={app.name}
                        >
                          <span className="text-xl">{app.icon ?? <Favicon url={app.url} size={20} className="rounded" />}</span>
                          <span className="truncate">{app.name}</span>
                        </button>
                        <button
                          aria-label="Reload app"
                          className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                          title="Reload app"
                          onClick={(e) => { e.stopPropagation(); reloadAppById(id); }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M12 4a8 8 0 1 1-7.45 11H6a6 6 0 1 0 1.76-4.24L10 12H4V6l2.12 2.12A7.98 7.98 0 0 1 12 4z"/>
                          </svg>
                        </button>
                        <button
                          aria-label="Close app"
                          className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                          title="Close app"
                          onClick={(e) => { e.stopPropagation(); closeApp(id); }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3 10.6 10.6 16.9 4.3z"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Clipboard panel */}
              {panel === 'clipboard' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 rounded bg-neutral-800" onClick={syncFromSystemClipboard}>Add from clipboard</button>
                    {clipboard.length > 0 && (
                      <button className="px-3 py-1 rounded bg-neutral-800" onClick={clearClipboard}>Clear</button>
                    )}
                  </div>
                  {clipboard.length === 0 && (
                    <div className="text-sm text-neutral-400">Copied text will appear here. You can also paste into Notepad.</div>
                  )}
                  {clipboard.map((c) => (
                    <div key={c.id} className="bg-neutral-900 hover:bg-neutral-800 rounded p-2">
                      <div className="text-xs text-neutral-400 mb-1">{new Date(c.ts).toLocaleTimeString()}</div>
                      <div className="text-sm break-words whitespace-pre-wrap max-h-32 overflow-auto">{c.text}</div>
                      <div className="mt-2 flex gap-2">
                        <button
                          aria-label="Copy text"
                          title="Copy"
                          className="p-2 rounded bg-blue-600 hover:bg-blue-500"
                          onClick={() => copyText(c.text)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M16 1H6a2 2 0 0 0-2 2v10h2V3h10V1z"/>
                            <path d="M18 5H10a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 14H10V7h8v12z"/>
                          </svg>
                        </button>
                        <button
                          aria-label="Delete entry"
                          title="Delete"
                          className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                          onClick={() => removeClipboard(c.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm1 2V4h4v1h-4z"/>
                            <path d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8zm4 2v9h2v-9h-2zm4 0v9h2v-9h-2z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Notepad panel */}
              {panel === 'notes' && (
                <div className="flex flex-col gap-2">
                  <textarea
                    className="w-full h-40 bg-neutral-900 rounded p-2 outline-none"
                    placeholder="Type or paste notes here..."
                    value={notepad}
                    onChange={(e) => setNotepad(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      aria-label="Copy all"
                      title="Copy all"
                      className="p-2 rounded bg-blue-600 hover:bg-blue-500"
                      onClick={() => copyText(notepad)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M16 1H6a2 2 0 0 0-2 2v10h2V3h10V1z"/>
                        <path d="M18 5H10a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 14H10V7h8v12z"/>
                      </svg>
                    </button>
                    <button
                      aria-label="Clear notes"
                      title="Clear"
                      className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                      onClick={() => setNotepad('')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm1 2V4h4v1h-4z"/>
                        <path d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8zm4 2v9h2v-9h-2zm4 0v9h2v-9h-2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop popover panel (chat-like) */}
      {/* Desktop popover panel (chat-like) with transitions */}
      <div className={clsx('hidden md:block fixed bottom-20 right-4 z-30 pointer-events-none')}
        aria-hidden={!switcherOpen}
      >
        <div
          className={clsx(
            'w-80 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden origin-bottom-right transform transition-all duration-200',
            switcherOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95'
          )}
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
              <div className="font-medium">Web OS</div>
              <div className="flex items-center gap-2">
                {installEvt && (
                  <button className="px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-sm" onClick={onInstall}>Install</button>
                )}
                {!showHome && (
                  <div className="flex items-center gap-1 text-sm">
                    <button className="px-2 py-1 rounded bg-neutral-800" onClick={() => changeZoom(-0.1)}>-</button>
                    <span className="min-w-[3.5rem] text-center">{Math.round(zoom * 100)}%</span>
                    <button className="px-2 py-1 rounded bg-neutral-800" onClick={() => changeZoom(+0.1)}>+</button>
                  </div>
                )}
                <button
                  aria-label="Refresh page"
                  title="Refresh"
                  className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                  onClick={refreshPage}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M12 4a8 8 0 1 1-7.45 11H6a6 6 0 1 0 1.76-4.24L10 12H4V6l2.12 2.12A7.98 7.98 0 0 1 12 4z"/>
                  </svg>
                </button>
                {!showHome && (
                  <>
                    <button className="px-2 py-1 rounded bg-neutral-800 text-sm" onClick={() => reloadAppById(activeApp!)}>Reload</button>
                    <button
                      aria-label="Copy URL"
                      title="Copy URL"
                      className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                      onClick={copyActiveUrl}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M16 1H6a2 2 0 0 0-2 2v10h2V3h10V1z"/>
                        <path d="M18 5H10a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 14H10V7h8v12z"/>
                      </svg>
                    </button>
                  </>
                )}
                <button className="px-2 py-1 rounded bg-neutral-800 text-sm" onClick={() => setActiveApp(null)}>Home</button>
                <button className="px-2 py-1 rounded bg-neutral-800 text-sm" onClick={() => setSwitcherOpen(false)}>Minimize</button>
              </div>
            </div>
            <div className="max-h-80 overflow-auto p-2">
              {/* Panel tabs */}
              <div className="flex items-center gap-2 mb-2">
                {(['apps','clipboard','notes'] as const).map((key) => (
                  <button key={key}
                    className={clsx('px-2.5 py-1 rounded text-sm', panel === key ? 'bg-neutral-800' : 'bg-neutral-900')}
                    onClick={() => setPanel(key)}
                  >{key === 'apps' ? 'Apps' : key === 'clipboard' ? 'Clipboard' : 'Notepad'}</button>
                ))}
              </div>

              {/* Apps panel */}
              {panel === 'apps' && (
                <div className="grid grid-cols-1 gap-1">
                  {openIds.length === 0 && (
                    <div className="text-sm text-neutral-400 px-2 py-3">No open apps</div>
                  )}
                  {openIds.map((id) => {
                    const app = apps.find((a) => a.id === id);
                    if (!app) return null;
                    const isActive = activeApp === id;
                    return (
                      <div
                        key={id}
                        className={clsx(
                          'w-full flex items-center gap-2 p-2 rounded transition-transform active:scale-[0.98]',
                          isActive ? 'bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800'
                        )}
                        title={app.name}
                      >
                        <button className="flex-1 flex items-center gap-2 text-left"
                          onClick={() => { setActiveApp(id); setSwitcherOpen(false); }}
                        >
                          <span className="text-xl">{app.icon ?? <Favicon url={app.url} size={18} className="rounded" />}</span>
                          <span className="truncate">{app.name}</span>
                        </button>
                        <button
                          aria-label="Reload app"
                          className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                          title="Reload app"
                          onClick={(e) => { e.stopPropagation(); reloadAppById(id); }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M12 4a8 8 0 1 1-7.45 11H6a6 6 0 1 0 1.76-4.24L10 12H4V6l2.12 2.12A7.98 7.98 0 0 1 12 4z"/>
                          </svg>
                        </button>
                        <button
                          aria-label="Close app"
                          className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                          title="Close app"
                          onClick={(e) => { e.stopPropagation(); closeApp(id); }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3 10.6 10.6 16.9 4.3z"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Clipboard panel */}
              {panel === 'clipboard' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button className="px-2.5 py-1 rounded bg-neutral-800 text-sm" onClick={syncFromSystemClipboard}>Add from clipboard</button>
                    {clipboard.length > 0 && (
                      <button className="px-2.5 py-1 rounded bg-neutral-800 text-sm" onClick={clearClipboard}>Clear</button>
                    )}
                  </div>
                  {clipboard.length === 0 && (
                    <div className="text-sm text-neutral-400 px-2 py-3">Copied text will appear here. You can also paste into Notepad.</div>
                  )}
                  {clipboard.map((c) => (
                    <div key={c.id} className="bg-neutral-900 hover:bg-neutral-800 rounded p-2">
                      <div className="text-xs text-neutral-400 mb-1">{new Date(c.ts).toLocaleString()}</div>
                      <div className="text-sm break-words whitespace-pre-wrap max-h-32 overflow-auto">{c.text}</div>
                      <div className="mt-2 flex gap-2">
                        <button
                          aria-label="Copy text"
                          title="Copy"
                          className="p-2 rounded bg-blue-600 hover:bg-blue-500"
                          onClick={() => copyText(c.text)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M16 1H6a2 2 0 0 0-2 2v10h2V3h10V1z"/>
                            <path d="M18 5H10a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 14H10V7h8v12z"/>
                          </svg>
                        </button>
                        <button
                          aria-label="Delete entry"
                          title="Delete"
                          className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                          onClick={() => removeClipboard(c.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm1 2V4h4v1h-4z"/>
                            <path d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8zm4 2v9h2v-9h-2zm4 0v9h2v-9h-2z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notepad panel */}
              {panel === 'notes' && (
                <div className="flex flex-col gap-2">
                  <textarea
                    className="w-full h-40 bg-neutral-900 rounded p-2 outline-none"
                    placeholder="Type or paste notes here..."
                    value={notepad}
                    onChange={(e) => setNotepad(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      aria-label="Copy all"
                      title="Copy all"
                      className="p-2 rounded bg-blue-600 hover:bg-blue-500"
                      onClick={() => copyText(notepad)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M16 1H6a2 2 0 0 0-2 2v10h2V3h10V1z"/>
                        <path d="M18 5H10a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 14H10V7h8v12z"/>
                      </svg>
                    </button>
                    <button
                      aria-label="Clear notes"
                      title="Clear"
                      className="p-2 rounded bg-neutral-800 hover:bg-neutral-700"
                      onClick={() => setNotepad('')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm1 2V4h4v1h-4z"/>
                        <path d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8zm4 2v9h2v-9h-2zm4 0v9h2v-9h-2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
