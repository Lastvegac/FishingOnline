import type { FastifyRequest } from 'fastify';
import { DEFAULT_UTC_OFFSET_MINUTES } from '@fwo/game-config';

const zonePattern = /^[A-Za-z][A-Za-z0-9_+\-/]{0,63}$/;

/** IANA zone from the `X-Time-Zone` header when valid; otherwise undefined (fall back to Vietnam). */
export function requestTimeZone(request: FastifyRequest): string | undefined {
  const value = request.headers['x-time-zone'];
  if (typeof value !== 'string' || !zonePattern.test(value)) return undefined;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions()
      .timeZone;
  } catch {
    return undefined;
  }
}

/** Offset of `timeZone` from UTC at instant `now`, honouring daylight saving time. */
export function utcOffsetMinutes(timeZone: string | undefined, now: number) {
  if (!timeZone) return DEFAULT_UTC_OFFSET_MINUTES;
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(now))
    .find((part) => part.type === 'timeZoneName')?.value;
  const match = name?.match(/^GMT(?:([+-])(\d{2}):(\d{2}))?$/);
  if (!match) return DEFAULT_UTC_OFFSET_MINUTES;
  if (!match[1]) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

export const requestUtcOffset = (request: FastifyRequest, now: number) =>
  utcOffsetMinutes(requestTimeZone(request), now);
