'use client';

import { useState } from 'react';

/** Copies text; a value starting with "/" is turned into a full link for this site. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        const value = text.startsWith('/') ? `${window.location.origin}${text}` : text;
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          window.prompt('Copy this:', value);
        }
      }}
    >
      {done ? 'Copied ✓' : label}
    </button>
  );
}
