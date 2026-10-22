import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/auth-admin';
import { db } from '@/lib/supabase/admin';
import { PHOTO_BUCKET, PHOTO_LIMIT } from '@/lib/types';
import { isUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 4 * 1024 * 1024; // stays under the 4.5 MB serverless body limit

/** Identify the real image type from magic bytes (never trust the client's content-type). */
function sniff(b: Buffer): { ext: string; type: string } | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', type: 'image/png' };
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Same-origin only (the session cookie is SameSite=Lax; this is a second guard).
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const client = db();
  const { data: ev } = await client.from('events').select('id').eq('id', id).maybeSingle();
  if (!ev) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be under 4 MB' }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return NextResponse.json({ error: 'Only JPEG, PNG or WebP images' }, { status: 415 });

  const { count } = await client.from('event_photos').select('id', { count: 'exact', head: true }).eq('event_id', id);
  if ((count ?? 0) >= PHOTO_LIMIT) return NextResponse.json({ error: `Limit of ${PHOTO_LIMIT} photos reached` }, { status: 409 });

  const path = `${id}/${randomUUID()}.${kind.ext}`;
  const up = await client.storage.from(PHOTO_BUCKET).upload(path, buf, { contentType: kind.type, upsert: false });
  if (up.error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });

  // The database trigger is the final, race-safe enforcement of the 20-photo cap.
  const ins = await client.from('event_photos').insert({ event_id: id, storage_path: path, position: count ?? 0 });
  if (ins.error) {
    await client.storage.from(PHOTO_BUCKET).remove([path]);
    const full = /photo_limit_reached/.test(ins.error.message);
    return NextResponse.json({ error: full ? `Limit of ${PHOTO_LIMIT} photos reached` : 'Could not save photo' }, { status: full ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
