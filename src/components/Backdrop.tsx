'use client';

import { useEffect, useState } from 'react';
import { CoverArt } from '@/components/CoverArt';
import { THEME_KEYS } from '@/lib/themes';

/**
 * Fixed, softly blurred, low-opacity rotating backdrop.
 * With photos: cycles the event's gallery images. Without: cycles generated festival art.
 */
export function Backdrop({ images = [], theme = 'lantern', interval = 7000 }: { images?: string[]; theme?: string; interval?: number }) {
  const art = [theme, ...THEME_KEYS.filter((t) => t !== theme)].slice(0, 4);
  const count = images.length ? Math.min(images.length, 20) : art.length;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (count < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % count), interval);
    return () => clearInterval(t);
  }, [count, interval]);

  return (
    <div className="backdrop" aria-hidden="true">
      {images.length
        ? images.slice(0, 20).map((src, k) => (
            <div key={src} className={`layer${k === i ? ' on' : ''}`} style={{ backgroundImage: `url("${src}")` }} />
          ))
        : art.map((t, k) => (
            <div key={t} className={`layer${k === i ? ' on' : ''}`}>
              <CoverArt theme={t} seed="backdrop" />
            </div>
          ))}
    </div>
  );
}
