'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const MAX_EDGE = 1600;

/** Resize + re-encode in the browser so uploads stay small (free-tier friendly). */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.82),
  );
}

export function PhotoUploader({ eventId, used, limit }: { eventId: string; used: number; limit: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const remaining = Math.max(0, limit - used);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setNote(null);
    const list = Array.from(files).slice(0, remaining);
    let ok = 0;
    let failed = 0;
    for (const f of list) {
      try {
        const blob = await compress(f);
        const body = new FormData();
        body.append('file', blob, 'photo.jpg');
        const res = await fetch(`/api/admin/events/${eventId}/photos`, { method: 'POST', body });
        if (res.ok) ok++;
        else {
          failed++;
          if (res.status === 409) break;
        }
      } catch {
        failed++;
      }
    }
    const skipped = files.length - list.length;
    setNote(
      `${ok} uploaded${failed ? `, ${failed} failed` : ''}${skipped > 0 ? `, ${skipped} skipped (limit of ${limit} per event)` : ''}.`,
    );
    setBusy(false);
    if (input.current) input.current.value = '';
    router.refresh();
  }

  return (
    <div className="stack">
      <p>
        <b className="num">{used}/{limit}</b> photos used. {remaining > 0 ? `${remaining} slots left.` : 'The gallery is full. Remove a photo to add another.'}
      </p>
      <label className="btn btn-primary" style={{ width: 'fit-content', opacity: remaining === 0 || busy ? 0.5 : 1, cursor: remaining === 0 || busy ? 'not-allowed' : 'pointer' }}>
        {busy ? 'Uploading…' : 'Choose photos'}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr"
          disabled={remaining === 0 || busy}
          onChange={(e) => onPick(e.target.files)}
        />
      </label>
      {note && <div className="flash flash-ok" role="status">{note}</div>}
    </div>
  );
}
