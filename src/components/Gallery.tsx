'use client';

import { useCallback, useEffect, useState } from 'react';

export function Gallery({ photos }: { photos: { id: string; url: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((v) => (v === null ? v : (v + d + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, step]);

  if (!photos.length) return <p className="muted">No photos yet. The organiser can add up to 20.</p>;

  return (
    <>
      <div className="gallery-grid">
        {photos.map((p, i) => (
          <button key={p.id} className="thumb" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${photos.length}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`Event photo ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[open].url} alt={`Event photo ${open + 1}`} onClick={(e) => e.stopPropagation()} />
          <button className="lb-btn lb-prev" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous photo">‹</button>
          <button className="lb-btn lb-next" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next photo">›</button>
          <button className="lb-btn lb-close" onClick={close} aria-label="Close">✕</button>
          <span className="lb-count">{open + 1} / {photos.length}</span>
        </div>
      )}
    </>
  );
}
