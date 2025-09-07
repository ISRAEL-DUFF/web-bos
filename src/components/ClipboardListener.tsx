"use client";

import React from 'react';
import { useAppStore } from '@/store/appStore';

export default function ClipboardListener() {
  const addClipboard = useAppStore((s) => s.addClipboard);

  React.useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      try {
        const t = e.clipboardData?.getData('text/plain');
        if (t) addClipboard(t);
      } catch {}
    };
    window.addEventListener('copy', onCopy as any);
    return () => window.removeEventListener('copy', onCopy as any);
  }, [addClipboard]);

  return null;
}

