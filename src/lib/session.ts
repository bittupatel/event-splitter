import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { isUuid } from '@/lib/validate';

const MAX_AGE = 12 * 60 * 60; // 12 hours

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set to 32+ characters.');
  return new TextEncoder().encode(s);
}

const cookieName = (eventId: string) => `es_${eventId}`;

/** Event-scoped participant session (signed, httpOnly). One cookie per event. */
export async function createMemberSession(eventId: string, participantId: string) {
  const token = await new SignJWT({ eid: eventId, pid: participantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(cookieName(eventId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function getMemberSession(eventId: string): Promise<{ eventId: string; participantId: string } | null> {
  const token = (await cookies()).get(cookieName(eventId))?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    if (payload.eid !== eventId || typeof payload.pid !== 'string' || !isUuid(payload.pid)) return null;
    return { eventId, participantId: payload.pid };
  } catch {
    return null;
  }
}

export async function clearMemberSession(eventId: string) {
  (await cookies()).delete(cookieName(eventId));
}
