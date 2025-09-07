"use client";

import React from 'react';

type Props = {
  url: string;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
};

export default function Favicon({ url, size = 24, className, fallback }: Props) {
  const [errored, setErrored] = React.useState(false);
  let origin = '';
  try { origin = new URL(url).origin; } catch {}
  const src = origin ? `${origin}/favicon.ico` : undefined;

  if (!src || errored) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        aria-hidden
        title={origin || url}
      >
        {fallback ?? <span>🌐</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      className={className}
      alt=""
      onError={() => setErrored(true)}
    />
  );
}

