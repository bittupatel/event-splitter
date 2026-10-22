import { createHash, randomInt } from 'node:crypto';

export const OTP_TTL_MINUTES = 30;

/** 6-digit one-time code, generated with a CSPRNG. */
export const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** Only this hash is stored. Bound to event + participant so a code cannot be replayed elsewhere. */
export function hashOtp(code: string, eventId: string, participantId: string): string {
  const secret = process.env.SESSION_SECRET ?? '';
  return createHash('sha256').update(`${secret}:${eventId}:${participantId}:${code}`).digest('hex');
}
