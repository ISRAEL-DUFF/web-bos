"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppItem } from '@/types';

type State = {
  apps: AppItem[];
  openApps: string[]; // LRU order, last is most recent
  activeApp: string | null;
  lruLimit: number;
  zoom: Record<string, number>; // per-app zoom factor
};

type Actions = {
  addApp: (app: Omit<AppItem, 'id' | 'lastOpened'> & { id?: string }) => string;
  editApp: (id: string, patch: Partial<Omit<AppItem, 'id'>>) => void;
  deleteApp: (id: string) => void;
  openApp: (id: string) => void;
  closeApp: (id: string) => void;
  setActiveApp: (id: string | null) => void;
  setLruLimit: (n: number) => void;
  appsById: () => Record<string, AppItem>;
  getZoom: (id: string) => number;
  setZoom: (id: string, z: number) => void;
};

const genId = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

const safeStorage = createJSONStorage(() => {
  if (typeof window !== 'undefined') return window.localStorage;
  // Fallback no-op storage for SSR build phase
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  } as unknown as Storage;
});

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      apps: [],
      openApps: [],
      activeApp: null,
      lruLimit: 4,
      zoom: {},

      addApp: (app) => {
        const id = app.id ?? genId();
        const item: AppItem = {
          id,
          name: app.name?.trim() || new URL(app.url).hostname,
          url: app.url,
          icon: app.icon,
          lastOpened: Date.now(),
        };
        set((s) => ({ apps: [...s.apps, item] }));
        return id;
      },

      editApp: (id, patch) => {
        set((s) => ({
          apps: s.apps.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },

      deleteApp: (id) => {
        set((s) => {
          const apps = s.apps.filter((a) => a.id !== id);
          const openApps = s.openApps.filter((x) => x !== id);
          const activeApp = s.activeApp === id ? (openApps[openApps.length - 1] ?? null) : s.activeApp;
          const { [id]: _removed, ...zoom } = s.zoom;
          return { apps, openApps, activeApp, zoom };
        });
      },

      openApp: (id) => {
        set((s) => {
          const now = Date.now();
          const apps = s.apps.map((a) => (a.id === id ? { ...a, lastOpened: now } : a));
          const without = s.openApps.filter((x) => x !== id);
          const openApps = [...without, id];
          // Enforce LRU limit (remove from front)
          const limit = Math.max(1, s.lruLimit);
          const toClose = openApps.length - limit;
          const trimmed = toClose > 0 ? openApps.slice(toClose) : openApps;
          const activeApp = id;
          return { apps, openApps: trimmed, activeApp };
        });
      },

      closeApp: (id) => {
        set((s) => {
          const openApps = s.openApps.filter((x) => x !== id);
          const activeApp = s.activeApp === id ? (openApps[openApps.length - 1] ?? null) : s.activeApp;
          return { openApps, activeApp };
        });
      },

      setActiveApp: (id) => {
        set((s) => {
          if (id == null) return { activeApp: null };
          const now = Date.now();
          const apps = s.apps.map((a) => (a.id === id ? { ...a, lastOpened: now } : a));
          const without = s.openApps.filter((x) => x !== id);
          const openApps = [...without, id];
          return { apps, openApps, activeApp: id };
        });
      },

      setLruLimit: (n) => set({ lruLimit: Math.max(1, n) }),

      appsById: () => get().apps.reduce<Record<string, AppItem>>((acc, a) => { acc[a.id] = a; return acc; }, {}),

      getZoom: (id) => get().zoom[id] ?? 1,
      setZoom: (id, z) => set((s) => ({ zoom: { ...s.zoom, [id]: Math.max(0.5, Math.min(2, Number.isFinite(z) ? z : 1)) } })),
    }),
    {
      name: 'web-os',
      version: 1,
      storage: safeStorage,
      partialize: (s) => ({ apps: s.apps, openApps: s.openApps, activeApp: s.activeApp, lruLimit: s.lruLimit, zoom: s.zoom }),
    }
  )
);
